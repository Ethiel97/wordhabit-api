import {
  UserWordProgress,
  UserWordProgressStatus,
} from '../entities/user-word-progress';

export type SubmitWordReviewResultState = {
  status: UserWordProgressStatus;
  masteryLevel: number;
  reviewCount: number;
  lastReviewedAt: Date;
  nextReviewAt: Date | null;
};

type ComputeWordReviewStateParams = {
  current: UserWordProgress;
  correct: boolean;
  now: Date;
};

export function computeWordReviewState({
  current,
  correct,
  now,
}: ComputeWordReviewStateParams): SubmitWordReviewResultState {
  // A missed card costs no mastery — it only resets the interval, so the
  // word comes back tomorrow instead of in a month. Flashcard grading is
  // self-assessed: docking progress for admitting you forgot teaches the
  // user to tap "Got it" instead, which corrupts the very signal the
  // scheduler runs on. The interval *is* the correction. An objectively
  // scored quiz can afford to penalise, because it cannot be gamed.
  const nextMasteryLevel = correct
    ? Math.min(current.masteryLevel + 15, 100)
    : current.masteryLevel;

  const status =
    nextMasteryLevel >= 100
      ? UserWordProgressStatus.MASTERED
      : UserWordProgressStatus.LEARNING;

  return {
    status,
    masteryLevel: nextMasteryLevel,
    reviewCount: current.reviewCount + 1,
    lastReviewedAt: now,
    nextReviewAt:
      status === UserWordProgressStatus.MASTERED
        ? null
        : computeNextReviewAt(nextMasteryLevel, correct, now),
  };
}

function computeNextReviewAt(
  masteryLevel: number,
  correct: boolean,
  now: Date,
): Date {
  const nextReviewAt = new Date(now);

  if (!correct) {
    nextReviewAt.setDate(nextReviewAt.getDate() + 1);
    return nextReviewAt;
  }

  if (masteryLevel <= 20) {
    nextReviewAt.setDate(nextReviewAt.getDate() + 1);
  } else if (masteryLevel <= 40) {
    nextReviewAt.setDate(nextReviewAt.getDate() + 3);
  } else if (masteryLevel <= 60) {
    nextReviewAt.setDate(nextReviewAt.getDate() + 7);
  } else if (masteryLevel <= 80) {
    nextReviewAt.setDate(nextReviewAt.getDate() + 14);
  } else {
    nextReviewAt.setDate(nextReviewAt.getDate() + 30);
  }

  return nextReviewAt;
}
