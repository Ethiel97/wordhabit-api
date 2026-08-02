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
