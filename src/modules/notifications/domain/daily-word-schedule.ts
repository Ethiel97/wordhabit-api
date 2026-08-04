import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { NotificationSlot } from './entities/notification';

/** Matches the cron in DailyWordScheduler. */
export const SWEEP_WINDOW_MINUTES = 30;

/** Wall-clock time each slot fires, mirroring the app's ReminderSlot. */
const SLOT_TIMES: Record<NotificationSlot, { hour: number; minute: number }> = {
  [NotificationSlot.MORNING]: { hour: 7, minute: 30 },
  [NotificationSlot.MIDDAY]: { hour: 12, minute: 30 },
  [NotificationSlot.EVENING]: { hour: 21, minute: 0 },
};

export type DueSlot = {
  timeZone: string;
  slot: NotificationSlot;
  /** The recipient's own day, `yyyy-MM-dd` — the delivery ledger's key. */
  localDate: string;
};

/**
 * Which (zone, slot) pairs fall inside the window opening at [tickAt]. A
 * window rather than an exact match: a sweep starting at 7:30:02, or
 * queued, must still fire the 7:30 slot.
 */
export function findDueSlots(
  tickAt: Date,
  timeZones: string[],
  windowMinutes: number = SWEEP_WINDOW_MINUTES,
): DueSlot[] {
  const due: DueSlot[] = [];

  for (const timeZone of timeZones) {
    const local = readLocalTime(tickAt, timeZone);
    if (local === null) continue;

    for (const [slot, time] of Object.entries(SLOT_TIMES)) {
      const elapsed =
        local.hour * 60 + local.minute - (time.hour * 60 + time.minute);

      if (elapsed >= 0 && elapsed < windowMinutes) {
        due.push({
          timeZone,
          slot: slot as NotificationSlot,
          localDate: local.date,
        });
      }
    }
  }

  return due;
}

type LocalTime = { date: string; hour: number; minute: number };

/** Null for an unknown zone: one bad row must not abort the sweep. */
function readLocalTime(instant: Date, timeZone: string): LocalTime | null {
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
