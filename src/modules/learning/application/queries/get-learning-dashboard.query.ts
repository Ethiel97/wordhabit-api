import { Query } from '@nestjs/cqrs';
import {
  ReviewQueueItem,
  TodayWordAssignment,
  UserLearningStats,
} from '../../domain/repositories/learning.repository';

export class GetLearningDashboardQuery extends Query<GetLearningDashboardResult> {
  constructor(
    public readonly userId: string,
    /** The caller's own day, `yyyy-MM-dd`. */
    public readonly localDate: string,
  ) {
    super();
  }
}

export interface GetLearningDashboardResult {
  todayWord: TodayWordAssignment | null;

  /**
   * The word assigned the day before, so the app can ask whether it
   * stuck. Looked up, never created: inventing one would put a word the
   * user never met into their history.
   */
  yesterdayWord: TodayWordAssignment | null;

  /**
   * What became of yesterday's word, null while the answer is owed.
   * Paired with [yesterdayWord]: word + null asks, word + outcome
   * reports, no word means there was nothing yesterday.
   */
  yesterdayHandled: YesterdayHandled | null;

  reviewQueue: {
    count: number;
    preview: ReviewQueueItem[];
  };

  streak: {
    currentStreak: number;
    longestStreak: number;
    /** `yyyy-MM-dd`, or null before the first activity. */
    lastActivityLocalDate: string | null;
  };

  stats: UserLearningStats;

  todayQuizCompleted: boolean;

  /**
   * Whether a broken chain can still be bought back, and what it would
   * cost to fix.
   *
   * Sent on the dashboard rather than asked for separately because the
   * offer has to appear the moment the learner opens the app: the window
   * closes on its own, and a screen that has to fetch before it can ask
   * would show the prompt late or not at all.
   */
  streakRepair: StreakRepairOffer;
}

export type StreakRepairOffer = {
  available: boolean;
  /** Days a repair would fill, oldest first. Empty when unavailable. */
  missedLocalDates: string[];
  /**
   * How long the chain was when it broke. Zero when unavailable.
   *
   * Distinct from `restoredStreak`: the learner may have practised again
   * since coming back, so what they get back is longer than what they
   * lost. "Your 20-day streak broke" is the true sentence; announcing 22
   * would name a number they never reached.
   */
  brokenStreak: number;
  /**
   * Last day of the chain that broke. Null when unavailable.
   *
   * Sent so a client can draw the run the gap interrupted: the streak
   * fields only describe the *current* chain, which after a break is the
   * day or two since the learner came back.
   */
  brokenOnLocalDate: string | null;
  /** What the streak would become. Zero when unavailable. */
  restoredStreak: number;
  /** Repairs the learner has left this calendar month. */
  repairsLeftThisMonth: number;
};

/** The outcome of yesterday's recall, once it has been answered. */
export type YesterdayHandled = {
  /** `yyyy-MM-dd`, the day the word comes back. */
  nextReviewOn: string;

  /**
   * Null when nobody was asked: rescheduling from the detail screen
   * moves the due date and records no review.
   */
  recalled: boolean | null;

  masteryBefore: number;
  masteryAfter: number;
};
