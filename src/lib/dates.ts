const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type IsoDate = string;

export function assertIsoDate(date: string): asserts date is IsoDate {
  if (!ISO_DATE_RE.test(date)) {
    throw new Error(`Invalid ISO date: ${date}`);
  }
}

export function parseIsoDate(date: IsoDate): Date {
  assertIsoDate(date);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${date}`);
  }
  return parsed;
}

export function formatIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function todayIsoDate(): IsoDate {
  return formatIsoDate(new Date());
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const parsed = parseIsoDate(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return formatIsoDate(parsed);
}

export function diffDays(startDate: IsoDate, endDate: IsoDate): number {
  const start = parseIsoDate(startDate).getTime();
  const end = parseIsoDate(endDate).getTime();
  return Math.round((end - start) / 86_400_000);
}

export function compareIsoDates(left: IsoDate, right: IsoDate): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

export function minIsoDate(left: IsoDate, right: IsoDate): IsoDate {
  return compareIsoDates(left, right) <= 0 ? left : right;
}

export function maxIsoDate(left: IsoDate, right: IsoDate): IsoDate {
  return compareIsoDates(left, right) >= 0 ? left : right;
}

export function clampIsoDate(date: IsoDate, min: IsoDate, max: IsoDate): IsoDate {
  if (compareIsoDates(date, min) < 0) {
    return min;
  }
  if (compareIsoDates(date, max) > 0) {
    return max;
  }
  return date;
}

export function getIsoDayOfWeek(date: IsoDate): number {
  // Sunday=0 ... Saturday=6
  return parseIsoDate(date).getUTCDay();
}

export function nearestPastOrSameWeekday(date: IsoDate, weekday: number): IsoDate {
  const day = getIsoDayOfWeek(date);
  const delta = (day - weekday + 7) % 7;
  return addDays(date, -delta);
}
