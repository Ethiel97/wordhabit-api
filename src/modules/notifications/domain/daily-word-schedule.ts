import { NotificationSlot } from './entities/notification';
import {
  isWithinWindow,
  readLocalTime,
  SWEEP_WINDOW_MINUTES,
  WallClock,
} from './local-time';

/** Wall-clock time each slot fires, mirroring the app's ReminderSlot. */
const SLOT_TIMES: Record<NotificationSlot, WallClock> = {
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

/** Which (zone, slot) pairs fall inside the window opening at [tickAt]. */
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
      if (isWithinWindow(local, time, windowMinutes)) {
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
