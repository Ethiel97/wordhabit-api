/**
 * Calendar helpers for `yyyy-MM-dd` strings.
 *
 * Every function parses as UTC midnight: the input carries no zone and
 * the output is formatted back the same way, so UTC is just a calendar
 * with no DST to trip over.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Returns [date] moved by [days], still as `yyyy-MM-dd`. */
export function shiftLocalDate(date: string, days: number): string {
  const parsed = Date.parse(`${date}T00:00:00.000Z`);
  return new Date(parsed + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Whole days from [from] to [to]; negative when [to] is earlier. */
export function daysBetweenLocalDates(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  return Math.round((end - start) / MS_PER_DAY);
}

/**
 * The instant a `yyyy-MM-dd` day is stored at. Never the server's
 * midnight: the same date would then mean different things in the API
 * and in the worker.
 */
export function localDateToInstant(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/** Reads back the day [localDateToInstant] encoded. */
export function instantToLocalDate(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}
