import { ExceptionType, Person, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  applyException,
  buildCrewChangeEvents,
  ExceptionInput,
  generateDefaultPlan,
  ScheduleAssignment,
  validatePlan,
} from "@/lib/scheduler";
import { todayIsoDate } from "@/lib/dates";
import { ROLE_ORDER } from "@/lib/roles";
import { DashboardData } from "@/types/rotation";

function toSchedulerAssignments(records: Awaited<ReturnType<typeof prisma.assignment.findMany>>): ScheduleAssignment[] {
  return records.map((record) => ({
    id: record.id,
    role: record.role,
    personId: record.personId,
    startDate: record.startDate,
    endDate: record.endDate,
  }));
}

export async function getPeople(): Promise<Person[]> {
  return prisma.person.findMany({
    orderBy: [{ active: "desc" }, { primaryRole: "asc" }, { name: "asc" }],
  });
}

export async function createPerson(input: {
  name: string;
  primaryRole: Role;
  employerId?: string;
  contact?: string;
  notes?: string;
}): Promise<Person> {
  return prisma.person.create({
    data: {
      name: input.name,
      primaryRole: input.primaryRole,
      employerId: input.employerId?.trim() || null,
      contact: input.contact?.trim() || null,
      notes: input.notes?.trim() || null,
      active: true,
    },
  });
}

export async function updatePerson(
  personId: string,
  input: {
    name?: string;
    primaryRole?: Role;
    employerId?: string;
    contact?: string;
    notes?: string;
    active?: boolean;
  },
): Promise<Person> {
  return prisma.person.update({
    where: { id: personId },
    data: {
      name: input.name,
      primaryRole: input.primaryRole,
      employerId: input.employerId === undefined ? undefined : input.employerId || null,
      contact: input.contact === undefined ? undefined : input.contact || null,
      notes: input.notes === undefined ? undefined : input.notes || null,
      active: input.active,
    },
  });
}

export async function softDeletePerson(personId: string): Promise<Person> {
  return prisma.person.update({
    where: { id: personId },
    data: { active: false },
  });
}

export async function getDashboardData(date = todayIsoDate()): Promise<DashboardData> {
  const [assignmentRecords, people] = await Promise.all([
    prisma.assignment.findMany({
      include: { person: true },
      orderBy: [{ role: "asc" }, { startDate: "asc" }],
    }),
    prisma.person.findMany(),
  ]);

  const assignments = toSchedulerAssignments(assignmentRecords);
  const events = buildCrewChangeEvents(assignments);
  const upcoming = events
    .filter((event) => event.date >= date)
    .sort((a, b) => (a.date === b.date ? a.role.localeCompare(b.role) : a.date.localeCompare(b.date)))
    .slice(0, 16);

  const personMap = new Map(people.map((person) => [person.id, person]));

  const currentCrew = ROLE_ORDER.map((role) => {
    const active = assignmentRecords.find(
      (assignment) => assignment.role === role && assignment.startDate <= date && assignment.endDate > date,
    );

    return {
      role,
      personId: active?.personId ?? "unknown",
      name: active?.person.name ?? "Unassigned",
    };
  });

  const violations = validatePlan(assignments);

  return {
    today: date,
    timezoneNote: "Dates are treated as ship-local dates (no time-of-day).",
    currentCrew,
    upcomingChanges: upcoming.map((event) => ({
      role: event.role,
      date: event.date,
      outgoingPersonId: event.outgoingPersonId,
      outgoingName: personMap.get(event.outgoingPersonId)?.name ?? "Unknown",
      incomingPersonId: event.incomingPersonId,
      incomingName: personMap.get(event.incomingPersonId)?.name ?? "Unknown",
    })),
    warnings: violations.map((violation) => violation.message),
  };
}

export async function getAssignmentsForWindow(fromDate: string, toDate: string) {
  const assignments = await prisma.assignment.findMany({
    where: {
      startDate: { lt: toDate },
      endDate: { gt: fromDate },
    },
    include: { person: true },
    orderBy: [{ role: "asc" }, { startDate: "asc" }],
  });

  return assignments;
}

export async function getUpcomingEventDatesByRole(fromDate: string) {
  const assignments = await prisma.assignment.findMany({
    orderBy: [{ role: "asc" }, { startDate: "asc" }],
  });
  const events = buildCrewChangeEvents(toSchedulerAssignments(assignments));

  const grouped: Record<Role, string[]> = {
    DD_DAY: [],
    DD_NIGHT: [],
    MWD_DAY: [],
    MWD_NIGHT: [],
  };

  for (const event of events) {
    if (event.date >= fromDate) {
      grouped[event.role].push(event.date);
    }
  }

  for (const role of ROLE_ORDER) {
    grouped[role] = grouped[role].slice(0, 8);
  }

  return grouped;
}

export async function applyExceptionAndPersist(input: ExceptionInput & { reason: string }) {
  const allAssignments = await prisma.assignment.findMany({
    orderBy: [{ role: "asc" }, { startDate: "asc" }],
  });
  const scheduleAssignments = toSchedulerAssignments(allAssignments);

  const result = applyException(scheduleAssignments, input);
  const violations = validatePlan(result.assignments);
  if (violations.length > 0) {
    throw new Error(violations[0].message);
  }

  const payload = {
    type: input.type,
    role: input.role,
    plannedDate: input.plannedDate,
    requestedDate: "requestedDate" in input ? input.requestedDate : undefined,
    resolvedDate: result.resolvedDate,
    reason: input.reason,
  };

  await prisma.$transaction(async (tx) => {
    await tx.assignment.deleteMany({});
    await tx.assignment.createMany({
      data: result.assignments.map((assignment) => ({
        role: assignment.role,
        personId: assignment.personId,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
      })),
    });

    const exceptionRecord = await tx.exception.create({
      data: {
        type: input.type,
        role: input.role,
        oldStartDate: result.oldDate,
        oldEndDate: result.oldDate,
        newStartDate: result.resolvedDate,
        newEndDate: result.resolvedDate,
        reason: input.reason,
        createdBy: input.createdBy,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "EXCEPTION_APPLIED",
        entityType: "Exception",
        entityId: exceptionRecord.id,
        payloadJson: JSON.stringify(payload),
        createdBy: input.createdBy,
      },
    });
  });

  return result;
}

export async function generateAndReplaceDefaultPlan(params: {
  startDate: string;
  weeksForward: number;
  rolePools: Record<Role, { onPersonId: string; offPersonId: string }>;
}) {
  const generated = generateDefaultPlan({
    startDate: params.startDate,
    weeksForward: params.weeksForward,
    rolePools: params.rolePools,
  });

  const violations = validatePlan(generated.assignments);
  if (violations.length > 0) {
    throw new Error(`Generated plan is invalid: ${violations[0].message}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.assignment.deleteMany({});
    await tx.assignment.createMany({
      data: generated.assignments.map((assignment) => ({
        role: assignment.role,
        personId: assignment.personId,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
      })),
    });

    await tx.auditLog.create({
      data: {
        action: "PLAN_GENERATED",
        entityType: "Assignment",
        entityId: "bulk",
        payloadJson: JSON.stringify({
          startDate: params.startDate,
          weeksForward: params.weeksForward,
          generatedAssignments: generated.assignments.length,
          generatedEvents: generated.events.length,
        }),
        createdBy: "system",
      },
    });
  });

  return generated;
}

export function mapExceptionInputToScheduler(input: {
  type: ExceptionType;
  role: Role;
  plannedDate: string;
  requestedDate?: string;
  reason: string;
  createdBy: string;
}): ExceptionInput {
  if (input.type === "SWAP") {
    return {
      type: "SWAP",
      role: input.role,
      plannedDate: input.plannedDate,
      reason: input.reason,
      createdBy: input.createdBy,
    };
  }

  if (!input.requestedDate) {
    throw new Error("requestedDate is required for this exception type.");
  }

  if (input.type === "EARLY_RELIEF") {
    return {
      type: "EARLY_RELIEF",
      role: input.role,
      plannedDate: input.plannedDate,
      requestedDate: input.requestedDate,
      reason: input.reason,
      createdBy: input.createdBy,
    };
  }

  if (input.type === "DELAYED_JOIN") {
    return {
      type: "DELAYED_JOIN",
      role: input.role,
      plannedDate: input.plannedDate,
      requestedDate: input.requestedDate,
      reason: input.reason,
      createdBy: input.createdBy,
    };
  }

  return {
    type: "MANUAL_MOVE",
    role: input.role,
    plannedDate: input.plannedDate,
    requestedDate: input.requestedDate,
    reason: input.reason,
    createdBy: input.createdBy,
  };
}

export async function getExceptionsAudit(limit = 20) {
  return prisma.exception.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
