import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  GetLearnerXpQuery,
  GetLearnerXpResult,
} from '../queries/get-learner-xp.query';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';
import type { QuizRepository } from '../../domain/repositories/quiz.repository';
import { QUIZ_REPOSITORY } from '../../domain/repositories/quiz.repository';
import { shiftLocalDate } from '../../domain/services/local-date';
import {
  XP_PACE_WINDOW_DAYS,
  dailyPace,
  xpForQuizAnswers,
  xpForRecalls,
} from '../../domain/services/xp-scale';

@QueryHandler(GetLearnerXpQuery)
export class GetLearnerXpHandler implements IQueryHandler<
  GetLearnerXpQuery,
  GetLearnerXpResult
> {
  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,

    @Inject(QUIZ_REPOSITORY)
    private readonly quizRepository: QuizRepository,
  ) {}

  async execute(query: GetLearnerXpQuery): Promise<GetLearnerXpResult> {
    // Inclusive of today, so a seven-day window starts six days back.
    const from = shiftLocalDate(query.to, -(XP_PACE_WINDOW_DAYS - 1));

    const [lifetime, recent, quizLifetime, quizRecent] = await Promise.all([
      this.learningRepository.countCorrectReviews({ userId: query.userId }),
      this.learningRepository.countCorrectReviews({
        userId: query.userId,
        from,
        to: query.to,
      }),
      this.quizRepository.countCorrectQuizAnswers({
        userId: query.userId,
      }),
      this.quizRepository.countCorrectQuizAnswers({
        userId: query.userId,
        from,
        to: query.to,
      }),
    ]);

    return {
      xp: xpForRecalls(lifetime) + xpForQuizAnswers(quizLifetime),
      dailyXp: dailyPace(xpForRecalls(recent) + xpForQuizAnswers(quizRecent)),
    };
  }
}
