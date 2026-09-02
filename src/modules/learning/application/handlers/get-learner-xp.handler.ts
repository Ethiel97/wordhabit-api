import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  GetLearnerXpQuery,
  GetLearnerXpResult,
} from '../queries/get-learner-xp.query';
import type {
  LearnerBadgeRepository,
  WordProgressRepository,
} from '../../domain/repositories/learning.repository';
import {
  LEARNER_BADGE_REPOSITORY,
  WORD_PROGRESS_REPOSITORY,
} from '../../domain/repositories/learning.repository';
import type { QuizRepository } from '../../domain/repositories/quiz.repository';
import { QUIZ_REPOSITORY } from '../../domain/repositories/quiz.repository';
import {
  instantToLocalDate,
  shiftLocalDate,
} from '../../domain/services/local-date';
import {
  XP_PACE_WINDOW_DAYS,
  dailyPace,
  xpForBadges,
  xpForJourneys,
  xpForQuizAnswers,
  xpForRecalls,
} from '../../domain/services/xp-scale';

@QueryHandler(GetLearnerXpQuery)
export class GetLearnerXpHandler implements IQueryHandler<
  GetLearnerXpQuery,
  GetLearnerXpResult
> {
  constructor(
    @Inject(WORD_PROGRESS_REPOSITORY)
    private readonly wordProgressRepository: WordProgressRepository,

    @Inject(QUIZ_REPOSITORY)
    private readonly quizRepository: QuizRepository,

    @Inject(LEARNER_BADGE_REPOSITORY)
    private readonly badgeRepository: LearnerBadgeRepository,
  ) {}

  async execute(query: GetLearnerXpQuery): Promise<GetLearnerXpResult> {
    // Inclusive of today, so a seven-day window starts six days back.
    const from = shiftLocalDate(query.to, -(XP_PACE_WINDOW_DAYS - 1));

    const window = { userId: query.userId, from, to: query.to };

    const [reviews, quiz, badges] = await Promise.all([
      this.wordProgressRepository.findReviewXpFigures(window),
      this.quizRepository.findQuizXpFigures(window),
      this.badgeRepository.findUserBadges(query.userId),
    ]);

    // One day is one journey, however it ended.
    const journeyDays = new Set([...quiz.quizDays, ...reviews.masteryDays]);
    const recentJourneyDays = [...journeyDays].filter(
      (day) => day >= from && day <= query.to,
    ).length;

    // Badges are windowed on an instant, everything else on the
    // learner's own calendar day.
    const recentBadges = badges.filter(
      (badge) => instantToLocalDate(badge.earnedAt) >= from,
    ).length;

    return {
      xp:
        xpForRecalls(reviews.lifetimeCorrect) +
        xpForQuizAnswers(quiz.lifetimeCorrect) +
        xpForJourneys(journeyDays.size) +
        xpForBadges(badges.length),
      dailyXp: dailyPace(
        xpForRecalls(reviews.recentCorrect) +
          xpForQuizAnswers(quiz.recentCorrect) +
          xpForJourneys(recentJourneyDays) +
          xpForBadges(recentBadges),
      ),
    };
  }
}
