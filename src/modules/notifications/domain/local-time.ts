import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';

/** Matches the half-hour cron every notification sweep runs on. */
export const SWEEP_WINDOW_MINUTES = 30;

export type WallClock = { hour: number; minute: number };

export type LocalTime = WallClock & { date: string };

/** Null for an unknown zone: one bad row must not abort the sweep. */
export function readLocalTime(
  instant: Date,
  timeZone: string,
): LocalTime | null {
  try {
    const local = new TZDate(instant, timeZone);

    return {
      date: format(local, 'yyyy-MM-dd'),
      hour: local.getHours(),
      minute: local.getMinutes(),
    };
  } catch {
    return null;
  }
}

/** A window, not an exact match: a late or queued sweep must still fire. */
export function isWithinWindow(
  local: WallClock,
  time: WallClock,
  windowMinutes: number = SWEEP_WINDOW_MINUTES,
): boolean {
  const elapsed =
    local.hour * 60 + local.minute - (time.hour * 60 + time.minute);

  return elapsed >= 0 && elapsed < windowMinutes;
}

/** Calendar arithmetic: an instant minus 24 hours misses a day across DST. */
export function previousLocalDate(localDate: string): string {
  const [year, month, day] = localDate.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day - 1))
    .toISOString()
    .slice(0, 10);
}
