import {
  UserWordProgress,
  UserWordProgressMasteryLevel,
  UserWordProgressStatus,
} from '../entities/user-word-progress';

export type NextUserWordProgressState = {
  status: UserWordProgressStatus;
  masteryLevel: UserWordProgressMasteryLevel;
  seenAt?: Date | null;
  nextReviewAt?: Date | null;
};

type ComputeNextUserWordProgressStateParams = {
  current: UserWordProgress | null;
  requestedStatus: UserWordProgressStatus;
  now: Date;
};

export function computeNextUserWordProgressState({
  current,
  requestedStatus,
  now,
}: ComputeNextUserWordProgressStateParams): NextUserWordProgressState {
  const currentMastery = current?.masteryLevel ?? 0;
  const currentStatus = current?.status ?? null;

  switch (requestedStatus) {
    case UserWordProgressStatus.SEEN: {
      if (currentStatus == UserWordProgressStatus.MASTERED) {
        return {
          status: UserWordProgressStatus.MASTERED,
          masteryLevel: UserWordProgressMasteryLevel.MASTERED,
        };
      }

      if (currentStatus === UserWordProgressStatus.LEARNING) {
        return {
          status: UserWordProgressStatus.LEARNING,
          masteryLevel: currentMastery,
        };
      }

      return {
        status: UserWordProgressStatus.SEEN,
        masteryLevel: Math.max(
          currentMastery,
          UserWordProgressMasteryLevel.SEEN,
        ),
        seenAt: current?.seenAt ?? now,
      };
    }

    case UserWordProgressStatus.LEARNING: {
      const nextReviewAt = new Date(now);
      nextReviewAt.setDate(nextReviewAt.getDate() + 1);

      return {
        status: UserWordProgressStatus.LEARNING,
        masteryLevel: Math.max(
          currentMastery,
          UserWordProgressMasteryLevel.LEARNING,
        ),
        seenAt: current?.seenAt ?? now,
        nextReviewAt,
      };
    }

    case UserWordProgressStatus.MASTERED: {
      return {
        status: UserWordProgressStatus.MASTERED,
        masteryLevel: UserWordProgressMasteryLevel.MASTERED,
        seenAt: current?.seenAt ?? now,
        nextReviewAt: null,
      };
    }

    case UserWordProgressStatus.SKIPPED: {
      return {
        status: UserWordProgressStatus.SKIPPED,
        masteryLevel: currentMastery,
        seenAt: current?.seenAt,
        nextReviewAt: null,
      };
    }

    default: {
      return {
        status: requestedStatus,
        masteryLevel: currentMastery,
      };
    }
  }
}
