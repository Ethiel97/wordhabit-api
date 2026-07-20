import { Query } from '@nestjs/cqrs';
import {
  ReviewQueueItem,
  TodayWordAssignment,
  UserLearningStats,
} from '../../domain/repositories/learning.repository';

export class GetLearningDashboardQuery extends Query<GetLearningDashboardResult> {
  constructor(public readonly userId: string) {
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
    lastActivityDate: Date | null;
  };

  stats: UserLearningStats;
}
