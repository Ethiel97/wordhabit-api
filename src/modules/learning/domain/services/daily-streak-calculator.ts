import { differenceInCalendarDays, startOfDay } from 'date-fns';

export type UserLearningStreakSnapshot = {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
};

export type NextUserLearningStreakState = {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
};

type ComputeNextDailyStreakParams = {
  current: UserLearningStreakSnapshot | null;
  activityAt: Date;
};

export function computeNextDailyStreak({
  current,
  activityAt,
}: ComputeNextDailyStreakParams): NextUserLearningStreakState {
  const activityDay = startOfDay(activityAt);

  if (!current?.lastActivityDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(current?.longestStreak ?? 0, 1),
      lastActivityDate: activityDay,
    };
  }

  const lastActivityDay = startOfDay(current.lastActivityDate);
  const diff = differenceInCalendarDays(activityDay, lastActivityDay);

  if (diff === 0) {
    return {
      currentStreak: current.currentStreak,
      longestStreak: current.longestStreak,
      lastActivityDate: activityDay,
    };
  }

  if (diff === 1) {
    const nextCurrentStreak = current.currentStreak + 1;

    return {
      currentStreak: nextCurrentStreak,
      longestStreak: Math.max(current.longestStreak, nextCurrentStreak),
      lastActivityDate: activityDay,
    };
  }

  return {
    currentStreak: 1,
    longestStreak: current.longestStreak,
    lastActivityDate: activityDay,
  };
}
