import { describe, expect, it } from "vitest";
import { addDays, diffDays, getIsoDayOfWeek } from "../src/lib/dates";
import {
  applyException,
  buildCrewChangeEvents,
  generateDefaultPlan,
  validatePlan,
} from "../src/lib/scheduler";

const pools = {
  DD_DAY: { onPersonId: "dd-day-a", offPersonId: "dd-day-b" },
  DD_NIGHT: { onPersonId: "dd-night-a", offPersonId: "dd-night-b" },
  MWD_DAY: { onPersonId: "mwd-day-a", offPersonId: "mwd-day-b" },
  MWD_NIGHT: { onPersonId: "mwd-night-a", offPersonId: "mwd-night-b" },
} as const;

describe("scheduler.generateDefaultPlan", () => {
  it("keeps a stable 28/28 cadence for each role after initial staggering", () => {
    const startDate = "2026-01-01"; // Thursday
    const plan = generateDefaultPlan({
      startDate,
      weeksForward: 16,
      rolePools: pools,
    });

    const events = buildCrewChangeEvents(plan.assignments).filter((event) => event.role === "DD_DAY");

    // DD Day is first in deterministic role order and holds Thursday cadence.
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(getIsoDayOfWeek(events[0].date)).toBe(4);
    expect(getIsoDayOfWeek(events[1].date)).toBe(4);
    expect(diffDays(events[0].date, events[1].date)).toBe(28);
    expect(diffDays(events[1].date, events[2].date)).toBe(28);

    expect(validatePlan(plan.assignments)).toHaveLength(0);
  });

  it("stagger two roles that want the same Thursday when they are a forbidden pair", () => {
    const startDate = "2026-01-01"; // Thursday
    const plan = generateDefaultPlan({
      startDate,
      weeksForward: 8,
      rolePools: pools,
    });

    const events = buildCrewChangeEvents(plan.assignments);
    const firstDueDate = addDays(startDate, 28);
    const firstWindowEvents = events.filter(
      (event) => event.date >= firstDueDate && event.date <= addDays(firstDueDate, 1),
    );

    const ddDayEvent = firstWindowEvents.find((event) => event.role === "DD_DAY");
    const ddNightEvent = firstWindowEvents.find((event) => event.role === "DD_NIGHT");

    expect(ddDayEvent).toBeTruthy();
    expect(ddNightEvent).toBeTruthy();
    expect(ddDayEvent?.date).not.toBe(ddNightEvent?.date);

    expect(validatePlan(plan.assignments)).toHaveLength(0);
  });
});

describe("scheduler.applyException", () => {
  it("handles early relief by re-staggering to nearest valid date when requested date conflicts", () => {
    const startDate = "2026-01-01"; // Thursday
    const plan = generateDefaultPlan({
      startDate,
      weeksForward: 12,
      rolePools: pools,
    });

    const events = buildCrewChangeEvents(plan.assignments);
    const ddDayFirst = events.find((event) => event.role === "DD_DAY");
    const ddNightFirst = events.find((event) => event.role === "DD_NIGHT");

    expect(ddDayFirst).toBeTruthy();
    expect(ddNightFirst).toBeTruthy();

    const result = applyException(plan.assignments, {
      type: "EARLY_RELIEF",
      role: "DD_NIGHT",
      plannedDate: ddNightFirst!.date,
      requestedDate: ddDayFirst!.date,
      reason: "Personal emergency",
      createdBy: "test-user",
    });

    // Requested date conflicts with DD Day on same day, so deterministic nearest valid date is chosen.
    expect(result.resolvedDate).not.toBe(ddDayFirst!.date);
    expect(result.resolvedDate).toBe(addDays(ddDayFirst!.date, -1));

    const violations = validatePlan(result.assignments);
    expect(violations).toHaveLength(0);
  });
});
