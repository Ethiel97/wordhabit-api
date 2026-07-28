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
};

type ComputeNextDailyStreakParams = {
  current: UserLearningStreakSnapshot | null;
  /** The calendar day the activity happened on, `yyyy-MM-dd`. */
  activityLocalDate: string;
};

/**
 * Advances a daily streak.
 *
 * Works on calendar days the client reported, never on instants. Deriving
 * the day from a timestamp used the server's timezone, which meant a review
 * at 9pm in a UTC-5 zone landed on the following day: two reviews in one
 * local evening looked like two consecutive days (inflating the streak),
 * and a genuine two-day run could collapse into one.
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

  // Same day: already counted, nothing changes but the record of it.
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

  // A gap, or a clock that moved backwards: start again at one, and never
  // lower the best ever.
  return {
    currentStreak: 1,
    longestStreak: current.longestStreak,
    lastActivityLocalDate: activityLocalDate,
  };
}
