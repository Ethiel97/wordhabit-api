import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetLearningDashboardQuery,
  GetLearningDashboardResult,
  YesterdayHandled,
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

  /// Yesterday's word, and whether it is still waiting on an answer.
  ///
  /// "Answered" is read from the schedule rather than stored as a flag:
  /// a review pushes [nextReviewOn] past today, so a word still due
  /// today is precisely one nobody has answered yet. One less column,
  /// and no way for the flag and the schedule to disagree.
  ///
  /// Pending and handled are separate fields because the client renders
  /// three states, and one nullable field collapsed "done" into "never
  /// had a word".
  private async yesterdayRecall(
    query: GetLearningDashboardQuery,
    assignment: TodayWordAssignment | null,
  ): Promise<{
    pending: TodayWordAssignment | null;
    handled: YesterdayHandled | null;
  }> {
    if (!assignment) return { pending: null, handled: null };

    const progress = await this.learningRepository.findUserWordProgress({
      userId: query.userId,
      wordId: assignment.word.id,
    });

    // Day labels compare as strings — ISO dates sort chronologically.
    const nextReviewOn = progress?.nextReviewOn;
    const stillDue = !nextReviewOn || nextReviewOn <= query.localDate;

    if (stillDue) return { pending: assignment, handled: null };

    const lastReview = await this.learningRepository.findLastWordReview({
      userId: query.userId,
      wordId: assignment.word.id,
    });

    // Only this cycle's event counts: a reschedule clears the due date
    // without writing one, leaving the last review weeks stale.
    const yesterday = shiftLocalDate(query.localDate, -1);
    const review =
      lastReview && lastReview.localDate >= yesterday ? lastReview : null;

    // No event means nothing to report, so the card shows the current
    // level without a gain.
    const current = progress?.masteryLevel ?? 0;

    return {
      pending: assignment,
      handled: {
        nextReviewOn: nextReviewOn,
        recalled: review?.correct ?? null,
        masteryBefore: review?.masteryBefore ?? current,
        masteryAfter: review?.masteryAfter ?? current,
      },
    };
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

    const recall = await this.yesterdayRecall(query, yesterdayWord);

    return {
      todayWord,
      yesterdayWord: recall.pending,
      yesterdayHandled: recall.handled,

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
