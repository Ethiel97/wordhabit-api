import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetLearningDashboardQuery,
  GetLearningDashboardResult,
} from '../queries/get-learning-dashboard.query';
import { Inject } from '@nestjs/common';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';

@QueryHandler(GetLearningDashboardQuery)
export class GetLearningDashboardHandler implements IQueryHandler<
  GetLearningDashboardQuery,
  GetLearningDashboardResult
> {
  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
  ) {}

  async execute(
    query: GetLearningDashboardQuery,
  ): Promise<GetLearningDashboardResult> {
    const now = new Date();

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const [todayWord, reviewQueue, streak, stats] = await Promise.all([
      this.learningRepository.findTodayAssignment({
        userId: query.userId,
        assignedFor: today,
      }),

      this.learningRepository.findReviewQueue({
        userId: query.userId,
        now,
        limit: 5,
      }),

      this.learningRepository.findUserLearningStreak(query.userId),

      this.learningRepository.findUserLearningStats(query.userId),
    ]);

    return {
      todayWord,

      reviewQueue: {
        count: reviewQueue.length,
        preview: reviewQueue,
      },

      streak: {
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
      },

      stats,
    };
  }
}
