import {
  isWithinWindow,
  previousLocalDate,
  readLocalTime,
  SWEEP_WINDOW_MINUTES,
  WallClock,
} from './local-time';

/** Before the 21:00 EVENING slot, whose learners are skipped rather than pushed twice. */
export const STREAK_RISK_TIME: WallClock = { hour: 19, minute: 30 };

export type DueStreakRiskZone = {
  timeZone: string;
  localDate: string;
  yesterday: string;
};

export function findDueStreakRiskZones(
  tickAt: Date,
  timeZones: string[],
  windowMinutes: number = SWEEP_WINDOW_MINUTES,
): DueStreakRiskZone[] {
  const due: DueStreakRiskZone[] = [];

  for (const timeZone of timeZones) {
    const local = readLocalTime(tickAt, timeZone);
    if (local === null) continue;
    if (!isWithinWindow(local, STREAK_RISK_TIME, windowMinutes)) continue;

    due.push({
      timeZone,
      localDate: local.date,
      yesterday: previousLocalDate(local.date),
    });
  }

  return due;
}
