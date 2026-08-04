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
}

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
