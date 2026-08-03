import {
  UserWordProgress,
  UserWordProgressStatus,
} from '../entities/user-word-progress';
import { shiftLocalDate } from './local-date';

/** Mastery earned by one correct graded review. */
const MASTERY_STEP = 15;

const MASTERY_MAX = 100;

/**
 * Where a mastered word lands when its owner says it slipped.
 *
 * Below the mastered threshold so the word has a due date again, but at
 * the top of the band under it: it was mastered a moment ago, and the
 * next interval should reflect that rather than start over.
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
 * Moves a word's next review from the learner's own verdict, without
 * touching what they have earned.
 *
 * Deliberately not a review: the detail screen shows the definition, the
 * example and the synonyms, so "I know this" is an assertion, not a
 * recall. Granting it the mastery of a graded card would let anyone
 * master a word by tapping — and every interval the scheduler computes
 * afterwards would rest on that claim. Neither the review count, the
 * activity log nor the streak move here for the same reason.
 *
 * The one exception runs downwards: a mastered word cannot carry a due
 * date, so admitting it slipped has to demote it. Losing ground on your
 * own word is not an exploit.
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

  // A mastered word has no interval left to lengthen; saying you know it
  // asks for nothing.
  if (current.status === UserWordProgressStatus.MASTERED) {
    return {
      status: current.status,
      masteryLevel: current.masteryLevel,
      nextReviewOn: null,
    };
  }

  // The delay is computed as if the next tier had been earned, while the
  // stored mastery stays put: the learner buys time, not progress. A
  // wrong claim costs them nothing here and everything at the next
  // graded card, which resets the interval to a single day.
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
