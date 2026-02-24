/**
 * Rotation date utilities — ported from the old dates.ts.
 * Uses date-fns instead of manual Date manipulation for safety and readability.
 */

import {
  addDays as fnsAddDays,
  differenceInDays,
  format,
  parseISO,
  getDay,
  isValid,
} from "date-fns";

/** Rotation cycle length in days (28-day = 4-week rotation) */
export const DEFAULT_CYCLE_DAYS = 28;

/** Days of the week indexed 0=Sunday through 6=Saturday */
export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * Format a Date as ISO date string (YYYY-MM-DD).
 */
export function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Parse an ISO date string to a Date.
 */
export function fromIsoDate(isoDate: string): Date {
  const date = parseISO(isoDate);
  if (!isValid(date)) {
    throw new Error(`Invalid date: ${isoDate}`);
  }
  return date;
}

/**
 * Add days to an ISO date string, returning a new ISO date string.
 */
export function addDays(isoDate: string, days: number): string {
  return toIsoDate(fnsAddDays(fromIsoDate(isoDate), days));
}

/**
 * Difference in days between two ISO dates (end - start).
 */
export function diffDays(startDate: string, endDate: string): number {
  return differenceInDays(fromIsoDate(endDate), fromIsoDate(startDate));
}

/**
 * Get the day of week (0=Sunday) for an ISO date.
 */
export function getDayOfWeek(isoDate: string): number {
  return getDay(fromIsoDate(isoDate));
}

/**
 * Find the nearest past or same weekday relative to a given date.
 * Used to align crew change dates to helicopter days.
 */
export function nearestPastOrSameWeekday(isoDate: string, weekday: number): string {
  const day = getDayOfWeek(isoDate);
  const delta = (day - weekday + 7) % 7;
  return addDays(isoDate, -delta);
}

/**
 * Calculate the next crew change date based on a rotation start date
 * and the helicopter day (day of week).
 */
export function nextCrewChangeDate(
  rotationStartDate: string,
  helicopterDay: number,
  cycleDays: number = DEFAULT_CYCLE_DAYS
): string {
  const idealDate = addDays(rotationStartDate, cycleDays);
  return nearestPastOrSameWeekday(idealDate, helicopterDay);
}

/**
 * Generate a sequence of crew change dates from a start date.
 */
export function generateCrewChangeDates(
  startDate: string,
  helicopterDay: number,
  count: number,
  cycleDays: number = DEFAULT_CYCLE_DAYS
): string[] {
  const dates: string[] = [];
  let current = startDate;

  for (let i = 0; i < count; i++) {
    current = nextCrewChangeDate(current, helicopterDay, cycleDays);
    dates.push(current);
  }

  return dates;
}

/**
 * Calculate how many days into a rotation cycle an employee is.
 */
export function daysIntoRotation(rotationStartDate: string, currentDate: string): number {
  return diffDays(rotationStartDate, currentDate);
}

/**
 * Determine if a date falls on a specific day of the week.
 */
export function isWeekday(isoDate: string, weekday: number): boolean {
  return getDayOfWeek(isoDate) === weekday;
}
