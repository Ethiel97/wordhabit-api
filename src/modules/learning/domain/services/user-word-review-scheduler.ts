import {
  UserWordProgress,
  UserWordProgressStatus,
} from '../entities/user-word-progress';
import { shiftLocalDate } from './local-date';

export type SubmitWordReviewResultState = {
  status: UserWordProgressStatus;
  masteryLevel: number;
  reviewCount: number;
  lastReviewedAt: Date;
  nextReviewOn: string | null;
};

type ComputeWordReviewStateParams = {
  current: UserWordProgress;
  correct: boolean;
  /** The instant of the answer — a real event, kept as one. */
  now: Date;
  /** The learner's own day, `yyyy-MM-dd`, which intervals count from. */
  localDate: string;
};

export function computeWordReviewState({
  current,
  correct,
  now,
  localDate,
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
    nextReviewOn:
      status === UserWordProgressStatus.MASTERED
        ? null
        : shiftLocalDate(localDate, intervalInDays(nextMasteryLevel, correct)),
  };
}

/**
 * Days until the word comes back.
 *
 * Counted from the learner's calendar day, not from the moment they
 * answered: an interval anchored to the clock drifts later every cycle,
 * since one always answers a little after the card falls due.
 */
function intervalInDays(masteryLevel: number, correct: boolean): number {
  if (!correct) return 1;

  if (masteryLevel <= 20) return 1;
  if (masteryLevel <= 40) return 3;
  if (masteryLevel <= 60) return 7;
  if (masteryLevel <= 80) return 14;
  return 30;
}
