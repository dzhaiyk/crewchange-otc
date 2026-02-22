import { PrismaClient, Role } from "@prisma/client";
import { generateDefaultPlan, validatePlan } from "../src/lib/scheduler";
import { nearestPastOrSameWeekday, todayIsoDate } from "../src/lib/dates";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.exception.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.person.deleteMany();

  const seedPeople: Array<{ name: string; role: Role; employerId: string; contact: string }> = [
    { name: "Murat Aydin", role: "DD_DAY", employerId: "E1001", contact: "+90-500-100-1001" },
    { name: "Emre Kaya", role: "DD_DAY", employerId: "E1002", contact: "+90-500-100-1002" },
    { name: "Kerem Demir", role: "DD_NIGHT", employerId: "E2001", contact: "+90-500-200-1001" },
    { name: "Ozan Celik", role: "DD_NIGHT", employerId: "E2002", contact: "+90-500-200-1002" },
    { name: "Selim Arslan", role: "MWD_DAY", employerId: "E3001", contact: "+90-500-300-1001" },
    { name: "Baris Tekin", role: "MWD_DAY", employerId: "E3002", contact: "+90-500-300-1002" },
    { name: "Yusuf Yilmaz", role: "MWD_NIGHT", employerId: "E4001", contact: "+90-500-400-1001" },
    { name: "Can Erdem", role: "MWD_NIGHT", employerId: "E4002", contact: "+90-500-400-1002" },
  ];

  const createdPeople = await Promise.all(
    seedPeople.map((person) =>
      prisma.person.create({
        data: {
          name: person.name,
          primaryRole: person.role,
          employerId: person.employerId,
          contact: person.contact,
          active: true,
        },
      }),
    ),
  );

  const byRole = {
    DD_DAY: createdPeople.filter((person) => person.primaryRole === "DD_DAY"),
    DD_NIGHT: createdPeople.filter((person) => person.primaryRole === "DD_NIGHT"),
    MWD_DAY: createdPeople.filter((person) => person.primaryRole === "MWD_DAY"),
    MWD_NIGHT: createdPeople.filter((person) => person.primaryRole === "MWD_NIGHT"),
  };

  const startDate = nearestPastOrSameWeekday(todayIsoDate(), 4);
  const generated = generateDefaultPlan({
    startDate,
    weeksForward: 24,
    rolePools: {
      DD_DAY: { onPersonId: byRole.DD_DAY[0].id, offPersonId: byRole.DD_DAY[1].id },
      DD_NIGHT: { onPersonId: byRole.DD_NIGHT[0].id, offPersonId: byRole.DD_NIGHT[1].id },
      MWD_DAY: { onPersonId: byRole.MWD_DAY[0].id, offPersonId: byRole.MWD_DAY[1].id },
      MWD_NIGHT: { onPersonId: byRole.MWD_NIGHT[0].id, offPersonId: byRole.MWD_NIGHT[1].id },
    },
  });

  const violations = validatePlan(generated.assignments);
  if (violations.length > 0) {
    throw new Error(`Seeded plan invalid: ${violations[0].message}`);
  }

  await prisma.assignment.createMany({
    data: generated.assignments.map((assignment) => ({
      role: assignment.role,
      personId: assignment.personId,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
    })),
  });

  await prisma.auditLog.create({
    data: {
      action: "SEED_INITIALIZED",
      entityType: "Assignment",
      entityId: "seed",
      payloadJson: JSON.stringify({
        startDate,
        assignmentsCreated: generated.assignments.length,
        eventsCreated: generated.events.length,
      }),
      createdBy: "seed-script",
    },
  });

  console.log(`Seed completed. Start date: ${startDate}. Assignments: ${generated.assignments.length}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
