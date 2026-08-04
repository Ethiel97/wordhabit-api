import {
  UserWordProgress,
  UserWordProgressStatus,
} from '../entities/user-word-progress';
import { shiftLocalDate } from './local-date';

/** Mastery earned by one correct graded review. */
const MASTERY_STEP = 15;

const MASTERY_MAX = 100;

/**
 * Where a mastered word lands when its owner says it slipped: under the
 * threshold so it has a due date again, but at the top of the band.
 */
const DEMOTED_MASTERY_LEVEL = 85;

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
  /** The instant of the answer. */
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
  // A miss costs no mastery, only the interval. Flashcard grading is
  // self-assessed: docking progress teaches the user to tap "Got it",
  // which corrupts the signal the scheduler runs on.
  const nextMasteryLevel = correct
    ? Math.min(current.masteryLevel + MASTERY_STEP, MASTERY_MAX)
    : current.masteryLevel;

  const status =
    nextMasteryLevel >= MASTERY_MAX
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
 * Days until the word comes back, counted from the learner's calendar
 * day: anchored to the clock instead, an interval drifts later every
 * cycle.
 */
function intervalInDays(masteryLevel: number, correct: boolean): number {
  if (!correct) return 1;

  if (masteryLevel <= 20) return 1;
  if (masteryLevel <= 40) return 3;
  if (masteryLevel <= 60) return 7;
  if (masteryLevel <= 80) return 14;
  return 30;
}

export type RescheduleWordResultState = {
  status: UserWordProgressStatus;
  masteryLevel: number;
  nextReviewOn: string | null;
};

type ComputeWordRescheduleStateParams = {
  current: UserWordProgress;
  /** The learner's own verdict, given from the word's detail screen. */
  known: boolean;
  /** The learner's own day, `yyyy-MM-dd`, which intervals count from. */
  localDate: string;
};

/**
 * Moves a word's next review without touching what it earned.
 *
 * Not a review: the detail screen shows the definition, so "I know
 * this" is an assertion, not a recall, and granting it mastery would
 * let anyone master a word by tapping. Same reason no review count,
 * activity or streak moves here. The exception runs downwards, since a
 * mastered word cannot carry a due date.
 */
export function computeWordRescheduleState({
  current,
  known,
  localDate,
}: ComputeWordRescheduleStateParams): RescheduleWordResultState {
  if (!known) {
    return {
      status: UserWordProgressStatus.LEARNING,
      masteryLevel: Math.min(current.masteryLevel, DEMOTED_MASTERY_LEVEL),
      nextReviewOn: shiftLocalDate(localDate, intervalInDays(0, false)),
    };
  }

  // No interval left to lengthen.
  if (current.status === UserWordProgressStatus.MASTERED) {
    return {
      status: current.status,
      masteryLevel: current.masteryLevel,
      nextReviewOn: null,
    };
  }

  // Delay computed as if the next tier had been earned, mastery left
  // alone: the learner buys time, not progress. A false claim costs
  // nothing here and everything at the next graded card.
  const projectedMasteryLevel = Math.min(
    current.masteryLevel + MASTERY_STEP,
    MASTERY_MAX,
  );

  return {
    status: current.status,
    masteryLevel: current.masteryLevel,
    nextReviewOn: shiftLocalDate(
      localDate,
      intervalInDays(projectedMasteryLevel, true),
    ),
  };
}
