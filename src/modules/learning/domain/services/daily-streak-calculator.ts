import { daysBetweenLocalDates } from './local-date';

export type UserLearningStreakSnapshot = {
  currentStreak: number;
  longestStreak: number;
  /** `yyyy-MM-dd`, or null for a user who has never been active. */
  lastActivityLocalDate: string | null;
};

export type NextUserLearningStreakState = {
  currentStreak: number;
  longestStreak: number;
  lastActivityLocalDate: string;
  /**
   * What a gap just cost, so a repair has something to restore.
   *
   * Undefined on every path that does not break a chain, which lets the
   * caller leave the stored break untouched instead of clearing the one
   * a user is still allowed to repair.
   */
  brokenStreak?: number;
  /** Last day of the chain the gap ended, `yyyy-MM-dd`. */
  brokenOnLocalDate?: string;
};

type ComputeNextDailyStreakParams = {
  current: UserLearningStreakSnapshot | null;
  /** The calendar day the activity happened on, `yyyy-MM-dd`. */
  activityLocalDate: string;
};

/**
 * Advances a daily streak on the calendar days the client reported,
 * never on instants: derived from a timestamp in the server's timezone,
 * a review at 9pm UTC-5 lands on the following day and inflates the
 * streak.
 */
export function computeNextDailyStreak({
  current,
  activityLocalDate,
}: ComputeNextDailyStreakParams): NextUserLearningStreakState {
  if (!current?.lastActivityLocalDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(current?.longestStreak ?? 0, 1),
      lastActivityLocalDate: activityLocalDate,
    };
  }

  const daysSince = daysBetweenLocalDates(
    current.lastActivityLocalDate,
    activityLocalDate,
  );

  // Same day: already counted.
  if (daysSince === 0) {
    return {
      currentStreak: current.currentStreak,
      longestStreak: current.longestStreak,
      lastActivityLocalDate: activityLocalDate,
    };
  }

  // The next day: the chain holds.
  if (daysSince === 1) {
    const nextCurrentStreak = current.currentStreak + 1;
    return {
      currentStreak: nextCurrentStreak,
      longestStreak: Math.max(current.longestStreak, nextCurrentStreak),
      lastActivityLocalDate: activityLocalDate,
    };
  }

  // A gap, or a clock that moved backwards. The best ever never drops,
  // and what the gap cost is recorded so a repair can undo it.
  return {
    currentStreak: 1,
    longestStreak: current.longestStreak,
    lastActivityLocalDate: activityLocalDate,
    brokenStreak: current.currentStreak,
    brokenOnLocalDate: current.lastActivityLocalDate,
  };
}
