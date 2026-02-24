/**
 * Calendar / timeline computation utilities.
 *
 * Pure functions that compute onboard/offshore periods for employees,
 * generate week boundaries for the timeline grid, and calculate
 * shifted crew-change dates for the "Move Hitch" feature.
 */

import {
  addDays,
  diffDays,
  toIsoDate,
  fromIsoDate,
  nearestPastOrSameWeekday,
  DEFAULT_CYCLE_DAYS,
} from "./rotation";
import type { Employee, CrewChange, CrewChangeEntry } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Period {
  start: string; // ISO date
  end: string; // ISO date
  type: "onboard" | "offshore";
  isConfirmed: boolean; // true when backed by a CrewChange record
}

export interface TimelineWeek {
  start: string; // ISO date (Monday or week start)
  end: string; // ISO date (Sunday or week end)
}

/* ------------------------------------------------------------------ */
/*  computeRotationPeriods                                             */
/* ------------------------------------------------------------------ */

/**
 * Compute the onboard / offshore periods for a single employee within
 * a visible date range.
 *
 * Algorithm:
 *  1. Build a base 28-day on/off cycle from `rotation_start_date`.
 *  2. Collect "transition events" from confirmed CrewChangeEntry records
 *     that reference this employee (incoming = goes onboard, outgoing = goes offshore).
 *  3. Merge the events on top of the base cycle so confirmed data wins.
 */
export function computeRotationPeriods(
  employee: Employee,
  crewChanges: CrewChange[],
  entries: CrewChangeEntry[],
  rangeStart: string,
  rangeEnd: string,
): Period[] {
  const rotStart = employee.rotation_start_date ?? employee.created_at?.slice(0, 10);
  if (!rotStart) return [];

  // --- 1. Collect confirmed transition dates for this employee ----------
  const transitions: { date: string; goingOnboard: boolean }[] = [];

  for (const entry of entries) {
    // Find the parent crew change to get the date
    const cc = crewChanges.find((c) => c.id === entry.crew_change_id);
    if (!cc) continue;
    if (cc.status === "cancelled") continue;

    const date = cc.scheduled_date;

    if (entry.incoming_employee_id === employee.id) {
      transitions.push({ date, goingOnboard: true });
    }
    if (entry.outgoing_employee_id === employee.id) {
      transitions.push({ date, goingOnboard: false });
    }
  }

  // Sort transitions chronologically
  transitions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // --- 2. Build base cycle periods covering the range -------------------
  // Walk backwards from rotStart to find the first cycle boundary before rangeStart
  const totalRange = diffDays(rotStart, rangeEnd);
  const cyclesBefore = Math.ceil(Math.abs(diffDays(rotStart, rangeStart)) / DEFAULT_CYCLE_DAYS) + 2;
  const walkStart = addDays(rotStart, -(cyclesBefore * DEFAULT_CYCLE_DAYS));

  const basePeriods: Period[] = [];
  let cursor = walkStart;

  // The first period type depends on whether the employee starts onboard
  // We determine this from is_onboard or default to onboard if rotation_start_date is set
  let isOnboard = employee.is_onboard;

  // Align: from rotation_start_date, first cycle is onboard, then offshore, etc.
  // Count how many full cycles from rotStart to walkStart to determine phase
  const cyclesFromStart = Math.floor(diffDays(walkStart, rotStart) / DEFAULT_CYCLE_DAYS);
  // If even number of cycles from start, same phase as start (onboard); odd = opposite
  isOnboard = cyclesFromStart % 2 === 0;

  // Generate enough periods to cover through rangeEnd
  const maxPeriods = Math.ceil(totalRange / DEFAULT_CYCLE_DAYS) + cyclesBefore + 4;
  for (let i = 0; i < maxPeriods; i++) {
    const periodEnd = addDays(cursor, DEFAULT_CYCLE_DAYS);
    basePeriods.push({
      start: cursor,
      end: periodEnd,
      type: isOnboard ? "onboard" : "offshore",
      isConfirmed: false,
    });
    cursor = periodEnd;
    isOnboard = !isOnboard;
    if (cursor > rangeEnd) break;
  }

  // --- 3. Overlay confirmed transitions ---------------------------------
  if (transitions.length > 0) {
    // Rebuild periods using transition points
    const allPeriods: Period[] = [];

    // Determine initial state at rangeStart from base cycle
    let currentlyOnboard = getBasePhase(rotStart, rangeStart);

    // Check if any transitions before rangeStart set a different state
    for (const t of transitions) {
      if (t.date <= rangeStart) {
        currentlyOnboard = t.goingOnboard;
      }
    }

    // Now walk through from rangeStart building periods
    let periodStart = rangeStart;

    // Get only transitions within our range
    const rangeTransitions = transitions.filter(
      (t) => t.date > rangeStart && t.date <= rangeEnd,
    );

    for (const t of rangeTransitions) {
      // Period from current position to this transition
      if (t.date > periodStart) {
        allPeriods.push({
          start: periodStart,
          end: t.date,
          type: currentlyOnboard ? "onboard" : "offshore",
          isConfirmed: true,
        });
      }
      currentlyOnboard = t.goingOnboard;
      periodStart = t.date;
    }

    // Final period to rangeEnd
    if (periodStart < rangeEnd) {
      allPeriods.push({
        start: periodStart,
        end: rangeEnd,
        type: currentlyOnboard ? "onboard" : "offshore",
        isConfirmed: rangeTransitions.length > 0,
      });
    }

    return allPeriods;
  }

  // --- 4. Clip base periods to the visible range ------------------------
  return clipPeriods(basePeriods, rangeStart, rangeEnd);
}

/* ------------------------------------------------------------------ */
/*  getTimelineWeeks                                                   */
/* ------------------------------------------------------------------ */

/**
 * Generate an array of week boundaries starting from `startDate`.
 * Each week is 7 days. Used to define the column grid.
 */
export function getTimelineWeeks(startDate: string, weekCount: number): TimelineWeek[] {
  const weeks: TimelineWeek[] = [];
  let cursor = startDate;

  for (let i = 0; i < weekCount; i++) {
    const end = addDays(cursor, 6);
    weeks.push({ start: cursor, end });
    cursor = addDays(cursor, 7);
  }

  return weeks;
}

/* ------------------------------------------------------------------ */
/*  shiftCrewChangeDate                                                */
/* ------------------------------------------------------------------ */

/**
 * Shift a crew change date by N weeks, snapped to the helicopter day.
 */
export function shiftCrewChangeDate(
  currentDate: string,
  weeksOffset: number,
  helicopterDay: number,
): string {
  const shifted = addDays(currentDate, weeksOffset * 7);
  return nearestPastOrSameWeekday(shifted, helicopterDay);
}

/* ------------------------------------------------------------------ */
/*  getNextCrewChangeDate                                              */
/* ------------------------------------------------------------------ */

/**
 * For an employee, find their next crew-change date (transition point)
 * relative to `today`, using the base 28-day cycle.
 */
export function getNextCrewChangeDate(
  employee: Employee,
  helicopterDay: number,
  today: string,
): string | null {
  const rotStart = employee.rotation_start_date;
  if (!rotStart) return null;

  // Walk forward from rotation start in 28-day increments until we pass today
  let cursor = rotStart;
  const maxIterations = 100;
  for (let i = 0; i < maxIterations; i++) {
    const next = addDays(cursor, DEFAULT_CYCLE_DAYS);
    const aligned = nearestPastOrSameWeekday(next, helicopterDay);
    if (aligned >= today) return aligned;
    cursor = aligned;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Determine the base-cycle phase (onboard or not) at a given date. */
function getBasePhase(rotStart: string, queryDate: string): boolean {
  const days = diffDays(rotStart, queryDate);
  const cyclePosition = ((days % (DEFAULT_CYCLE_DAYS * 2)) + DEFAULT_CYCLE_DAYS * 2) % (DEFAULT_CYCLE_DAYS * 2);
  return cyclePosition < DEFAULT_CYCLE_DAYS;
}

/** Clip periods to a visible range, discarding anything fully outside. */
function clipPeriods(periods: Period[], rangeStart: string, rangeEnd: string): Period[] {
  const result: Period[] = [];

  for (const p of periods) {
    if (p.end <= rangeStart || p.start >= rangeEnd) continue;

    result.push({
      ...p,
      start: p.start < rangeStart ? rangeStart : p.start,
      end: p.end > rangeEnd ? rangeEnd : p.end,
    });
  }

  return result;
}

/**
 * Get the start date for the timeline view — the Monday of the week
 * containing the first day of the given month.
 */
export function getMonthViewStart(year: number, month: number): string {
  const firstOfMonth = toIsoDate(new Date(year, month, 1));
  const date = fromIsoDate(firstOfMonth);
  const day = date.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(firstOfMonth, mondayOffset);
}
