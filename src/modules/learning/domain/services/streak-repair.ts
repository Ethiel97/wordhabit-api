import { daysBetweenLocalDates, shiftLocalDate } from './local-date';

/** How long after a break a repair is still offered, in days. */
export const STREAK_REPAIR_WINDOW_DAYS = 3;

/** Repairs a Pro learner may spend per calendar month. */
export const STREAK_REPAIRS_PER_MONTH = 1;

export type BrokenStreakSnapshot = {
  /** Length of the chain the gap ended, or null if none is pending. */
  brokenStreak: number | null;
  /** Last day of that chain, `yyyy-MM-dd`, or null if none is pending. */
  brokenOnLocalDate: string | null;
  /** Where the streak stands now, after the break restarted it. */
  lastActivityLocalDate: string | null;
};

export type StreakRepairRefusal =
  | 'NOTHING_TO_REPAIR'
  /** The break is older than the window allows. */
  | 'WINDOW_CLOSED'
  /** One repair per calendar month. */
  | 'ALREADY_REPAIRED_THIS_MONTH';

export type StreakRepairAssessment =
  | {
      repairable: true;
      /** The days a repair would fill, in order. Never empty. */
      missedLocalDates: string[];
      /** What the streak becomes once those days are filled. */
      restoredStreak: number;
      /**
       * The last day the restored chain covers: today when it has been
       * practised, yesterday otherwise. Carried rather than re-derived,
       * because a day the learner practised is absent from
       * [missedLocalDates] and cannot be read back from it.
       */
      lastCountedLocalDate: string;
    }
  | { repairable: false; reason: StreakRepairRefusal };

/**
 * Whether a broken chain can still be stitched back together.
 *
 * The window is three days from the break rather than one, so a learner
 * who only opens the app two days later still gets the offer. That in
 * turn means the repair has to work *after* today's word: by then the
 * calculator has already restarted the chain at 1, which is exactly why
 * the break is recorded separately.
 *
 * [practisedLocalDates] are the days between the break and today that
 * do have activity. They are read from the review events rather than
 * assumed, so a day the learner actually practised is never marked as
 * bought.
 */
export function assessStreakRepair({
  streak,
  practisedLocalDates,
  todayLocalDate,
  repairedThisMonth,
}: {
  streak: BrokenStreakSnapshot;
  practisedLocalDates: readonly string[];
  todayLocalDate: string;
  repairedThisMonth: boolean;
}): StreakRepairAssessment {
  const { brokenStreak, brokenOnLocalDate } = streak;

  if (!brokenOnLocalDate || !brokenStreak || brokenStreak < 1) {
    return { repairable: false, reason: 'NOTHING_TO_REPAIR' };
  }

  const daysSinceBreak = daysBetweenLocalDates(
    brokenOnLocalDate,
    todayLocalDate,
  );

  // 0 or 1 means nothing is missing yet, and a negative value means the
  // device clock moved backwards.
  if (daysSinceBreak < 2) {
    return { repairable: false, reason: 'NOTHING_TO_REPAIR' };
  }

  if (daysSinceBreak > STREAK_REPAIR_WINDOW_DAYS) {
    return { repairable: false, reason: 'WINDOW_CLOSED' };
  }

  if (repairedThisMonth) {
    return { repairable: false, reason: 'ALREADY_REPAIRED_THIS_MONTH' };
  }

  const practised = new Set(practisedLocalDates);

  // Today only counts once it has been practised: an unfinished day is
  // not a hole to fill, it is simply still ahead.
  const practisedToday = practised.has(todayLocalDate);
  const lastCountedDay = practisedToday
    ? todayLocalDate
    : shiftLocalDate(todayLocalDate, -1);

  const missedLocalDates: string[] = [];
  for (
    let day = shiftLocalDate(brokenOnLocalDate, 1);
    daysBetweenLocalDates(day, lastCountedDay) >= 0;
    day = shiftLocalDate(day, 1)
  ) {
    if (!practised.has(day)) missedLocalDates.push(day);
  }

  if (missedLocalDates.length === 0) {
    return { repairable: false, reason: 'NOTHING_TO_REPAIR' };
  }

  // Every day from the break to the last counted one is then covered,
  // whether practised or filled, so the chain is simply that much longer.
  return {
    repairable: true,
    missedLocalDates,
    lastCountedLocalDate: lastCountedDay,
    restoredStreak:
      brokenStreak + daysBetweenLocalDates(brokenOnLocalDate, lastCountedDay),
  };
}

export type RepairedStreakState = {
  currentStreak: number;
  longestStreak: number;
  lastActivityLocalDate: string;
  /** Cleared: the break it described has been undone. */
  brokenStreak: null;
  brokenOnLocalDate: null;
};

/**
 * Restores the chain the gap broke.
 *
 * A filled day counts like any other, and the restored streak may set a
 * new record. The alternative, silently capping the record, reads as a
 * counting bug to the person who just paid to keep their streak. Honesty
 * lives in the progress map instead, where repaired days are marked and
 * visible.
 */
export function applyStreakRepair({
  streak,
  assessment,
}: {
  streak: { longestStreak: number };
  assessment: Extract<StreakRepairAssessment, { repairable: true }>;
}): RepairedStreakState {
  return {
    currentStreak: assessment.restoredStreak,
    longestStreak: Math.max(streak.longestStreak, assessment.restoredStreak),
    lastActivityLocalDate: assessment.lastCountedLocalDate,
    brokenStreak: null,
    brokenOnLocalDate: null,
  };
}
