import { addDays } from "./dates";

/**
 * A streak counts consecutive attendance days ending today, or ending yesterday
 * (so a member does not lose their streak before the gym opens today).
 */
export function computeStreak(dates: string[], today: string): number {
  const unique = new Set(dates);
  let cursor = unique.has(today) ? today : addDays(today, -1);
  if (!unique.has(cursor)) return 0;
  let streak = 0;
  while (unique.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function monthlyVisitCount(dates: string[], month: string): number {
  return dates.filter((date) => date.startsWith(month)).length;
}

export function weeklyBuckets(dates: string[], today: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6);
    return {
      date,
      count: dates.filter((value) => value === date).length,
      visited: dates.includes(date),
    };
  });
}
