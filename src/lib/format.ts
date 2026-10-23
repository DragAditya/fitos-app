import { format, formatDistanceToNow, parseISO } from "date-fns";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_CURRENCY = "INR";

export function formatMoney(
  cents: number,
  currency = DEFAULT_CURRENCY,
  options: { compact?: boolean } = {},
) {
  const amount = cents / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: options.compact ? 1 : amount % 1 === 0 ? 0 : 2,
    notation: options.compact ? "compact" : "standard",
  }).format(amount);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatDate(
  value: string | Date | null | undefined,
  tz = DEFAULT_TIMEZONE,
  pattern = "dd MMM yyyy",
) {
  if (!value) return "—";
  try {
    // Calendar dates (YYYY-MM-DD) are timezone-free: formatting them in a gym
    // timezone would shift the day on servers running in another zone.
    const dateOnly = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date =
      typeof value === "string"
        ? dateOnly
          ? new Date(`${value}T00:00:00Z`)
          : parseISO(value)
        : value;
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: dateOnly ? "UTC" : tz,
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(pattern === "dd MMM" ? { year: undefined } : {}),
    }).format(date);
  } catch {
    return "—";
  }
}

export function formatDateTime(
  value: string | Date | null | undefined,
  tz = DEFAULT_TIMEZONE,
) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTime(value: string | Date, tz = DEFAULT_TIMEZONE) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function timeAgo(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return formatDistanceToNow(date, { addSuffix: true });
}

export function greetingForHour(date = new Date(), tz = DEFAULT_TIMEZONE) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(
      date,
    ),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function monthLabel(value: string, tz = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    month: "long",
    year: "numeric",
  }).format(parseISO(`${value}-01`));
}

export function formatDayLabel(date: string) {
  return format(parseISO(date), "EEE");
}
