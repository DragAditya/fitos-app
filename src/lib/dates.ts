import { DEFAULT_TIMEZONE } from "./format";

/** Returns the current calendar date (YYYY-MM-DD) in a gym's timezone. */
export function todayISO(tz = DEFAULT_TIMEZONE, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** True when a timestamp is in the past. Kept out of components for render purity. */
export function isPastISO(value: string | Date, now = new Date()): boolean {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.getTime() < now.getTime();
}

export function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function startOfMonthISO(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonthISO(date: string): string {
  const parsed = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  parsed.setUTCMonth(parsed.getUTCMonth() + 1);
  parsed.setUTCDate(0);
  return parsed.toISOString().slice(0, 10);
}

export function monthDays(month: string): string[] {
  const start = `${month}-01`;
  const days = Number(endOfMonthISO(start).slice(8));
  return Array.from({ length: days }, (_, index) => addDays(start, index));
}

export function lastNDates(endDate: string, n: number): string[] {
  return Array.from({ length: n }, (_, index) => addDays(endDate, index - (n - 1)));
}

export function rangeStart(days: number, tz = DEFAULT_TIMEZONE): string {
  return addDays(todayISO(tz), -(days - 1));
}

export function parseISODate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function isoDateTime(date: Date): string {
  return date.toISOString();
}

export function nowInTimezone(tz = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}
