/**
 * Calendar helpers for `yyyy-MM-dd` strings.
 *
 * Activity is stored and queried as text precisely so timezones never
 * enter the picture. The only arithmetic anyone needs is "N days earlier",
 * and it lives here rather than being re-derived per handler.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Matches the `yyyy-MM-dd` shape the clients and the column agree on. */
export const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns [date] moved by [days], still as `yyyy-MM-dd`.
 *
 * Parsed as UTC midnight — a deliberate, self-cancelling choice: the input
 * carries no zone and the output is formatted back the same way, so UTC is
 * simply a calendar with no DST to trip over.
 */
export function shiftLocalDate(date: string, days: number): string {
  const parsed = Date.parse(`${date}T00:00:00.000Z`);
  return new Date(parsed + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * Whole days from [from] to [to]; negative when [to] is earlier.
 *
 * Both sides are read as UTC midnight, so the subtraction counts calendar
 * days exactly — there is no DST to shorten one of them.
 */
export function daysBetweenLocalDates(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  return Math.round((end - start) / MS_PER_DAY);
}

/**
 * The instant a `yyyy-MM-dd` day is stored at.
 *
 * UTC midnight, never the server's: a day is the *user's* calendar day,
 * and anchoring it to where the process happens to run makes the same
 * date mean different things in the API and in the worker.
 */
export function localDateToInstant(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/**
 * Reads back the day [localDateToInstant] encoded.
 *
 * UTC fields, matching how it was written. Rendering the instant in any
 * local zone would name the previous day west of Greenwich.
 */
export function instantToLocalDate(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}
