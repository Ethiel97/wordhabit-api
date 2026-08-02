import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetLearningDashboardQuery,
  GetLearningDashboardResult,
} from '../queries/get-learning-dashboard.query';
import { Inject } from '@nestjs/common';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';
import { TodayWordService } from '../services/today-word.service';
import { UserLearningProfileNotFoundError } from '../../../user-learning/application/errors/user-learning-profile-not-found.error';
import { CandidateWordNotFoundError } from '../errors/candidate-word-not-found.error';

@QueryHandler(GetLearningDashboardQuery)
export class GetLearningDashboardHandler implements IQueryHandler<
  GetLearningDashboardQuery,
  GetLearningDashboardResult
> {
  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,

    private readonly todayWordService: TodayWordService,
  ) {}

  async execute(
    query: GetLearningDashboardQuery,
  ): Promise<GetLearningDashboardResult> {
    const [todayWord, reviewQueue, streak, stats] = await Promise.all([
      this.todayWordService
        .getOrAssignTodayWord(query.userId, query.localDate)
        .catch((error) => {
          if (
            error instanceof UserLearningProfileNotFoundError ||
            error instanceof CandidateWordNotFoundError
          ) {
            return null;
          }

          throw error;
        }),

      this.learningRepository.findReviewQueue({
        userId: query.userId,
        localDate: query.localDate,
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
        // A streak is consecutive days ending here, so this one date
        // lets clients derive per-day activity (e.g. the week strip)
        // without any history table.
        lastActivityLocalDate: streak?.lastActivityLocalDate ?? null,
      },

      stats,
    };
  }
}
