import {
  addDays,
  compareIsoDates,
  diffDays,
  IsoDate,
  maxIsoDate,
  minIsoDate,
} from "./dates";
import { ROLE_FORBIDDEN_MAP, ROLE_ORDER, Role } from "./roles";

export interface ScheduleAssignment {
  id?: string;
  role: Role;
  personId: string;
  startDate: IsoDate;
  endDate: IsoDate;
}

export interface CrewChangeEvent {
  role: Role;
  date: IsoDate;
  outgoingPersonId: string;
  incomingPersonId: string;
}

export interface PlanViolation {
  code:
    | "MISSING_ROLE"
    | "INVALID_INTERVAL"
    | "OVERLAP"
    | "GAP"
    | "FORBIDDEN_SAME_DAY";
  message: string;
  role?: Role;
  date?: IsoDate;
}

export interface RolePool {
  onPersonId: string;
  offPersonId: string;
}

export interface GenerateDefaultPlanInput {
  startDate: IsoDate;
  weeksForward: number;
  rolePools: Record<Role, RolePool>;
  cycleDays?: number;
}

export type ExceptionType = "EARLY_RELIEF" | "DELAYED_JOIN" | "SWAP" | "MANUAL_MOVE";

interface ExceptionBaseInput {
  type: ExceptionType;
  role: Role;
  plannedDate: IsoDate;
  reason: string;
  createdBy: string;
}

export interface EarlyReliefInput extends ExceptionBaseInput {
  type: "EARLY_RELIEF";
  requestedDate: IsoDate;
}

export interface DelayedJoinInput extends ExceptionBaseInput {
  type: "DELAYED_JOIN";
  requestedDate: IsoDate;
}

export interface ManualMoveInput extends ExceptionBaseInput {
  type: "MANUAL_MOVE";
  requestedDate: IsoDate;
}

export interface SwapInput extends ExceptionBaseInput {
  type: "SWAP";
}

export type ExceptionInput =
  | EarlyReliefInput
  | DelayedJoinInput
  | ManualMoveInput
  | SwapInput;

export interface ApplyExceptionResult {
  assignments: ScheduleAssignment[];
  events: CrewChangeEvent[];
  oldDate: IsoDate;
  resolvedDate: IsoDate;
  message: string;
}

const FORWARD_STAGGER_OFFSETS = [0, 1, 2, 3, 4, 5, 6, -1, -2, -3];

function isForbiddenSameDay(roleA: Role, roleB: Role): boolean {
  return ROLE_FORBIDDEN_MAP[roleA].has(roleB);
}

function sortAssignmentsByRoleAndStart(
  assignments: ScheduleAssignment[],
): Record<Role, ScheduleAssignment[]> {
  const grouped: Record<Role, ScheduleAssignment[]> = {
    DD_DAY: [],
    DD_NIGHT: [],
    MWD_DAY: [],
    MWD_NIGHT: [],
  };

  for (const assignment of assignments) {
    grouped[assignment.role].push({ ...assignment });
  }

  for (const role of ROLE_ORDER) {
    grouped[role].sort((a, b) => compareIsoDates(a.startDate, b.startDate));
  }

  return grouped;
}

function flattenAssignments(grouped: Record<Role, ScheduleAssignment[]>): ScheduleAssignment[] {
  const flattened: ScheduleAssignment[] = [];
  for (const role of ROLE_ORDER) {
    for (const assignment of grouped[role]) {
      flattened.push(assignment);
    }
  }
  return flattened;
}

function normalizeRoleAssignments(assignments: ScheduleAssignment[]): ScheduleAssignment[] {
  const sorted = [...assignments].sort((a, b) => compareIsoDates(a.startDate, b.startDate));
  if (sorted.length === 0) {
    return sorted;
  }

  const normalized: ScheduleAssignment[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const previous = normalized[normalized.length - 1];

    if (previous.personId === current.personId && previous.endDate === current.startDate) {
      previous.endDate = current.endDate;
      continue;
    }

    normalized.push(current);
  }

  return normalized;
}

export function buildCrewChangeEvents(assignments: ScheduleAssignment[]): CrewChangeEvent[] {
  const grouped = sortAssignmentsByRoleAndStart(assignments);
  const events: CrewChangeEvent[] = [];

  for (const role of ROLE_ORDER) {
    const roleAssignments = grouped[role];

    for (let i = 0; i < roleAssignments.length - 1; i += 1) {
      const outgoing = roleAssignments[i];
      const incoming = roleAssignments[i + 1];

      if (outgoing.endDate !== incoming.startDate) {
        continue;
      }

      if (outgoing.personId === incoming.personId) {
        continue;
      }

      events.push({
        role,
        date: incoming.startDate,
        outgoingPersonId: outgoing.personId,
        incomingPersonId: incoming.personId,
      });
    }
  }

  return events.sort((a, b) => {
    const byDate = compareIsoDates(a.date, b.date);
    if (byDate !== 0) {
      return byDate;
    }
    return ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
  });
}

function getRolesByDate(events: CrewChangeEvent[]): Map<IsoDate, Role[]> {
  const rolesByDate = new Map<IsoDate, Role[]>();

  for (const event of events) {
    const existing = rolesByDate.get(event.date) ?? [];
    existing.push(event.role);
    rolesByDate.set(event.date, existing);
  }

  return rolesByDate;
}

function canPlaceRoleOnDate(role: Role, date: IsoDate, rolesByDate: Map<IsoDate, Role[]>): boolean {
  const rolesOnDate = rolesByDate.get(date) ?? [];

  if (rolesOnDate.includes(role)) {
    return false;
  }

  return rolesOnDate.every((existingRole) => !isForbiddenSameDay(role, existingRole));
}

function* forwardStaggerOffsets(maxMagnitude = 90): Generator<number> {
  const seen = new Set<number>();
  for (const offset of FORWARD_STAGGER_OFFSETS) {
    seen.add(offset);
    yield offset;
  }

  for (let delta = 7; delta <= maxMagnitude; delta += 1) {
    if (!seen.has(delta)) {
      yield delta;
    }
    if (!seen.has(-delta)) {
      yield -delta;
    }
  }
}

function* nearestOffsets(maxMagnitude = 60): Generator<number> {
  yield 0;
  for (let delta = 1; delta <= maxMagnitude; delta += 1) {
    yield delta;
    yield -delta;
  }
}

function pickStaggeredDate(
  baseDate: IsoDate,
  role: Role,
  rolesByDate: Map<IsoDate, Role[]>,
): IsoDate {
  for (const offset of forwardStaggerOffsets()) {
    const candidateDate = addDays(baseDate, offset);
    if (canPlaceRoleOnDate(role, candidateDate, rolesByDate)) {
      return candidateDate;
    }
  }

  throw new Error(`Unable to find staggered date for role ${role} around ${baseDate}`);
}

function findBoundaryIndex(assignments: ScheduleAssignment[], plannedDate: IsoDate): number {
  for (let i = 0; i < assignments.length - 1; i += 1) {
    if (
      assignments[i].endDate === plannedDate &&
      assignments[i + 1].startDate === plannedDate
    ) {
      return i;
    }
  }

  throw new Error(
    `No crew-change event found on ${plannedDate}. Pick an existing event date for the role.`,
  );
}

interface BoundaryWindow {
  minDate: IsoDate;
  maxDate: IsoDate;
}

function findNearestValidDate(
  preferredDate: IsoDate,
  role: Role,
  rolesByDate: Map<IsoDate, Role[]>,
  window: BoundaryWindow,
): IsoDate | null {
  for (const offset of nearestOffsets()) {
    const candidate = addDays(preferredDate, offset);

    if (compareIsoDates(candidate, window.minDate) < 0) {
      continue;
    }
    if (compareIsoDates(candidate, window.maxDate) > 0) {
      continue;
    }

    if (canPlaceRoleOnDate(role, candidate, rolesByDate)) {
      return candidate;
    }
  }

  return null;
}

function buildRoleEventMapExcludingRole(
  assignments: ScheduleAssignment[],
  excludedRole: Role,
): Map<IsoDate, Role[]> {
  const events = buildCrewChangeEvents(assignments).filter((event) => event.role !== excludedRole);
  return getRolesByDate(events);
}

function selectBoundaryDate(
  assignments: ScheduleAssignment[],
  roleAssignments: ScheduleAssignment[],
  boundaryIndex: number,
  role: Role,
  preferredDate: IsoDate,
  mode: "EARLY_RELIEF" | "DELAYED_JOIN" | "MANUAL_MOVE",
  plannedDate: IsoDate,
): IsoDate {
  const outgoing = roleAssignments[boundaryIndex];
  const incoming = roleAssignments[boundaryIndex + 1];

  let minDate = addDays(outgoing.startDate, 1);
  let maxDate = addDays(incoming.endDate, -1);

  if (mode === "EARLY_RELIEF") {
    maxDate = minIsoDate(maxDate, addDays(plannedDate, -1));
  }

  if (mode === "DELAYED_JOIN") {
    minDate = maxIsoDate(minDate, addDays(plannedDate, 1));
  }

  if (compareIsoDates(minDate, maxDate) > 0) {
    throw new Error("No valid movement window is available for this exception.");
  }

  const rolesByDate = buildRoleEventMapExcludingRole(assignments, role);
  const resolvedDate = findNearestValidDate(preferredDate, role, rolesByDate, {
    minDate,
    maxDate,
  });

  if (!resolvedDate) {
    throw new Error("No valid crew-change date found without violating constraints.");
  }

  return resolvedDate;
}

export function generateDefaultPlan(input: GenerateDefaultPlanInput): {
  assignments: ScheduleAssignment[];
  events: CrewChangeEvent[];
} {
  const cycleDays = input.cycleDays ?? 28;
  const horizonEnd = addDays(input.startDate, input.weeksForward * 7);

  const state: Record<
    Role,
    {
      onPersonId: string;
      offPersonId: string;
      currentStart: IsoDate;
      nextDueDate: IsoDate;
    }
  > = {
    DD_DAY: {
      onPersonId: input.rolePools.DD_DAY.onPersonId,
      offPersonId: input.rolePools.DD_DAY.offPersonId,
      currentStart: input.startDate,
      nextDueDate: addDays(input.startDate, cycleDays),
    },
    DD_NIGHT: {
      onPersonId: input.rolePools.DD_NIGHT.onPersonId,
      offPersonId: input.rolePools.DD_NIGHT.offPersonId,
      currentStart: input.startDate,
      nextDueDate: addDays(input.startDate, cycleDays),
    },
    MWD_DAY: {
      onPersonId: input.rolePools.MWD_DAY.onPersonId,
      offPersonId: input.rolePools.MWD_DAY.offPersonId,
      currentStart: input.startDate,
      nextDueDate: addDays(input.startDate, cycleDays),
    },
    MWD_NIGHT: {
      onPersonId: input.rolePools.MWD_NIGHT.onPersonId,
      offPersonId: input.rolePools.MWD_NIGHT.offPersonId,
      currentStart: input.startDate,
      nextDueDate: addDays(input.startDate, cycleDays),
    },
  };

  const assignments: ScheduleAssignment[] = [];
  const events: CrewChangeEvent[] = [];
  const rolesByDate = new Map<IsoDate, Role[]>();

  while (true) {
    const nextDueDate = ROLE_ORDER.reduce((earliest, role) => {
      if (!earliest) {
        return state[role].nextDueDate;
      }
      return compareIsoDates(state[role].nextDueDate, earliest) < 0
        ? state[role].nextDueDate
        : earliest;
    }, null as IsoDate | null);

    if (!nextDueDate || compareIsoDates(nextDueDate, horizonEnd) > 0) {
      break;
    }

    const rolesDue = ROLE_ORDER.filter((role) => state[role].nextDueDate === nextDueDate);
    const scheduledDates = new Map<Role, IsoDate>();

    for (const role of rolesDue) {
      const scheduledDate = pickStaggeredDate(nextDueDate, role, rolesByDate);
      scheduledDates.set(role, scheduledDate);
      const rolesOnDate = rolesByDate.get(scheduledDate) ?? [];
      rolesOnDate.push(role);
      rolesByDate.set(scheduledDate, rolesOnDate);
    }

    for (const role of rolesDue) {
      const current = state[role];
      const crewChangeDate = scheduledDates.get(role);
      if (!crewChangeDate) {
        throw new Error(`Failed to schedule crew change for role ${role}`);
      }

      assignments.push({
        role,
        personId: current.onPersonId,
        startDate: current.currentStart,
        endDate: crewChangeDate,
      });

      events.push({
        role,
        date: crewChangeDate,
        outgoingPersonId: current.onPersonId,
        incomingPersonId: current.offPersonId,
      });

      const nextOn = current.offPersonId;
      const nextOff = current.onPersonId;
      current.onPersonId = nextOn;
      current.offPersonId = nextOff;
      current.currentStart = crewChangeDate;
      current.nextDueDate = addDays(crewChangeDate, cycleDays);
    }
  }

  for (const role of ROLE_ORDER) {
    const current = state[role];
    assignments.push({
      role,
      personId: current.onPersonId,
      startDate: current.currentStart,
      endDate: current.nextDueDate,
    });
  }

  return {
    assignments: flattenAssignments(sortAssignmentsByRoleAndStart(assignments)),
    events,
  };
}

export function validatePlan(assignments: ScheduleAssignment[]): PlanViolation[] {
  const violations: PlanViolation[] = [];
  const grouped = sortAssignmentsByRoleAndStart(assignments);

  for (const role of ROLE_ORDER) {
    const roleAssignments = grouped[role];

    if (roleAssignments.length === 0) {
      violations.push({
        code: "MISSING_ROLE",
        role,
        message: `No assignments found for role ${role}.`,
      });
      continue;
    }

    for (let i = 0; i < roleAssignments.length; i += 1) {
      const current = roleAssignments[i];
      if (compareIsoDates(current.startDate, current.endDate) >= 0) {
        violations.push({
          code: "INVALID_INTERVAL",
          role,
          message: `Invalid interval for ${role}: ${current.startDate} to ${current.endDate}.`,
          date: current.startDate,
        });
      }

      if (i === 0) {
        continue;
      }

      const previous = roleAssignments[i - 1];
      if (compareIsoDates(current.startDate, previous.endDate) < 0) {
        violations.push({
          code: "OVERLAP",
          role,
          date: current.startDate,
          message: `Overlap detected for ${role} around ${current.startDate}.`,
        });
      }

      if (compareIsoDates(current.startDate, previous.endDate) > 0) {
        violations.push({
          code: "GAP",
          role,
          date: previous.endDate,
          message: `Coverage gap detected for ${role} between ${previous.endDate} and ${current.startDate}.`,
        });
      }
    }
  }

  const events = buildCrewChangeEvents(assignments);
  const eventsByDate = new Map<IsoDate, CrewChangeEvent[]>();
  for (const event of events) {
    const eventList = eventsByDate.get(event.date) ?? [];
    eventList.push(event);
    eventsByDate.set(event.date, eventList);
  }

  for (const [date, dailyEvents] of eventsByDate.entries()) {
    for (let i = 0; i < dailyEvents.length; i += 1) {
      for (let j = i + 1; j < dailyEvents.length; j += 1) {
        const left = dailyEvents[i];
        const right = dailyEvents[j];
        if (isForbiddenSameDay(left.role, right.role)) {
          violations.push({
            code: "FORBIDDEN_SAME_DAY",
            date,
            message: `Forbidden same-day crew change on ${date}: ${left.role} and ${right.role}.`,
          });
        }
      }
    }
  }

  return violations;
}

export function applyException(
  assignments: ScheduleAssignment[],
  input: ExceptionInput,
): ApplyExceptionResult {
  if (!input.reason.trim()) {
    throw new Error("Reason is required.");
  }

  const grouped = sortAssignmentsByRoleAndStart(assignments);
  const roleAssignments = grouped[input.role];

  if (roleAssignments.length < 2) {
    throw new Error(`Role ${input.role} does not have enough assignments to apply exception.`);
  }

  const boundaryIndex = findBoundaryIndex(roleAssignments, input.plannedDate);
  const outgoing = roleAssignments[boundaryIndex];
  const incoming = roleAssignments[boundaryIndex + 1];
  const oldDate = input.plannedDate;

  if (input.type === "SWAP") {
    const previousPerson = outgoing.personId;
    outgoing.personId = incoming.personId;
    incoming.personId = previousPerson;

    grouped[input.role] = normalizeRoleAssignments(grouped[input.role]);
    const normalized = flattenAssignments(grouped);
    return {
      assignments: normalized,
      events: buildCrewChangeEvents(normalized),
      oldDate,
      resolvedDate: input.plannedDate,
      message: `Swap applied for ${input.role} on ${input.plannedDate}.`,
    };
  }

  const requestedDate = input.requestedDate;
  if (input.type === "EARLY_RELIEF" && compareIsoDates(requestedDate, input.plannedDate) >= 0) {
    throw new Error("Early relief date must be earlier than the planned date.");
  }

  if (input.type === "DELAYED_JOIN" && compareIsoDates(requestedDate, input.plannedDate) <= 0) {
    throw new Error("Delayed join date must be later than the planned date.");
  }

  const mode =
    input.type === "EARLY_RELIEF"
      ? "EARLY_RELIEF"
      : input.type === "DELAYED_JOIN"
        ? "DELAYED_JOIN"
        : "MANUAL_MOVE";

  const resolvedDate = selectBoundaryDate(
    assignments,
    roleAssignments,
    boundaryIndex,
    input.role,
    requestedDate,
    mode,
    input.plannedDate,
  );

  outgoing.endDate = resolvedDate;
  incoming.startDate = resolvedDate;

  grouped[input.role] = normalizeRoleAssignments(grouped[input.role]);
  const normalized = flattenAssignments(grouped);
  const violations = validatePlan(normalized);
  if (violations.length > 0) {
    throw new Error(violations[0].message);
  }

  const distance = diffDays(input.plannedDate, resolvedDate);
  const shiftLabel =
    distance === 0
      ? "without date change"
      : distance > 0
        ? `${distance} day(s) later`
        : `${Math.abs(distance)} day(s) earlier`;

  return {
    assignments: normalized,
    events: buildCrewChangeEvents(normalized),
    oldDate,
    resolvedDate,
    message: `${input.type} applied for ${input.role} (${shiftLabel}).`,
  };
}
