import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetLearningDashboardQuery,
  GetLearningDashboardResult,
} from '../queries/get-learning-dashboard.query';
import { Inject } from '@nestjs/common';
import type {
  LearningRepository,
  TodayWordAssignment,
} from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';
import { TodayWordService } from '../services/today-word.service';
import { UserLearningProfileNotFoundError } from '../../../user-learning/application/errors/user-learning-profile-not-found.error';
import { CandidateWordNotFoundError } from '../errors/candidate-word-not-found.error';
import {
  localDateToInstant,
  shiftLocalDate,
} from '../../domain/services/local-date';

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

  /// Yesterday's word, unless the learner has already answered for it.
  ///
  /// "Answered" is read from the schedule rather than stored as a flag:
  /// a review pushes [nextReviewOn] past today, so a word still due
  /// today is precisely one nobody has answered yet. One less column,
  /// and no way for the flag and the schedule to disagree.
  private async pendingRecall(
    query: GetLearningDashboardQuery,
    assignment: TodayWordAssignment | null,
  ): Promise<TodayWordAssignment | null> {
    if (!assignment) return null;

    const progress = await this.learningRepository.findUserWordProgress({
      userId: query.userId,
      wordId: assignment.word.id,
    });

    // Day labels compare as strings — ISO dates sort chronologically.
    const nextReviewOn = progress?.nextReviewOn;
    const stillDue = !nextReviewOn || nextReviewOn <= query.localDate;

    return stillDue ? assignment : null;
  }

  async execute(
    query: GetLearningDashboardQuery,
  ): Promise<GetLearningDashboardResult> {
    const [todayWord, yesterdayWord, reviewQueue, streak, stats] =
      await Promise.all([
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

        this.learningRepository.findTodayAssignment({
          userId: query.userId,
          assignedFor: localDateToInstant(shiftLocalDate(query.localDate, -1)),
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
      yesterdayWord: await this.pendingRecall(query, yesterdayWord),

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
