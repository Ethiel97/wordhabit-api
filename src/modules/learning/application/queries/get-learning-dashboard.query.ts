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
   * stuck — a spaced-repetition product should not forget its own last
   * word.
   *
   * Looked up, never created: a user who was away yesterday has no word
   * for it, and inventing one would put a word they never met into their
   * history.
   */
  yesterdayWord: TodayWordAssignment | null;

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
