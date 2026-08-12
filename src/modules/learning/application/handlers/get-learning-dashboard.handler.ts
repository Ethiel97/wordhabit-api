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
import {
  emptyUserLearningStats,
  LEARNING_REPOSITORY,
} from '../../domain/repositories/learning.repository';
import { TodayWordService } from '../services/today-word.service';
import { CandidateWordNotFoundError } from '../errors/candidate-word-not-found.error';
import {
  localDateToInstant,
  shiftLocalDate,
} from '../../domain/services/local-date';
import {
  QUIZ_REPOSITORY,
  type QuizRepository,
} from '../../domain/repositories/quiz.repository';
import {
  USER_LEARNING_REPOSITORY,
  type UserLearningRepository,
} from '../../../user-learning/domain/repositories/user-learning.repository';
import { UserLearningProfileNotFoundError } from '../../../user-learning/application/errors/user-learning-profile-errors';

@QueryHandler(GetLearningDashboardQuery)
export class GetLearningDashboardHandler implements IQueryHandler<
  GetLearningDashboardQuery,
  GetLearningDashboardResult
> {
  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,

    @Inject(QUIZ_REPOSITORY)
    private readonly quizRepository: QuizRepository,

    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,

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
    // Resolved before the parallel block because yesterday's word is
    // keyed on the profile: a learner with two languages has two words
    // for yesterday, and only this one's belongs on this dashboard.
    const profile =
      await this.userLearningRepository.findActiveUserLearningProfile(
        query.userId,
      );

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

        profile
          ? this.learningRepository.findTodayAssignment({
              userLearningProfileId: profile.id,
              assignedFor: localDateToInstant(
                shiftLocalDate(query.localDate, -1),
              ),
            })
          : null,

        profile
          ? this.learningRepository.findReviewQueue({
              userId: query.userId,
              targetLanguage: profile.targetLanguage,
              localDate: query.localDate,
              limit: 5,
            })
          : [],

        this.learningRepository.findUserLearningStreak(query.userId),

        profile
          ? this.learningRepository.findUserLearningStats({
              userId: query.userId,
              targetLanguage: profile.targetLanguage,
            })
          : emptyUserLearningStats(),
      ]);

    const [todayQuizCompleted, recall] = await Promise.all([
      todayWord
        ? this.quizRepository.hasQuizResultForWord({
            userId: query.userId,
            wordId: todayWord.word.id,
            localDate: query.localDate,
          })
        : Promise.resolve(false),

      this.yesterdayRecall(query, yesterdayWord),
    ]);

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
      todayQuizCompleted,
      stats,
    };
  }
}
