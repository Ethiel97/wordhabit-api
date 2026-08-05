import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  GetLearnerXpQuery,
  GetLearnerXpResult,
} from '../queries/get-learner-xp.query';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';
import { shiftLocalDate } from '../../domain/services/local-date';
import {
  XP_PACE_WINDOW_DAYS,
  dailyPace,
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
  ) {}

  async execute(query: GetLearnerXpQuery): Promise<GetLearnerXpResult> {
    // Inclusive of today, so a seven-day window starts six days back.
    const from = shiftLocalDate(query.to, -(XP_PACE_WINDOW_DAYS - 1));

    const [lifetime, recent] = await Promise.all([
      this.learningRepository.countCorrectReviews({ userId: query.userId }),
      this.learningRepository.countCorrectReviews({
        userId: query.userId,
        from,
        to: query.to,
      }),
    ]);

    return {
      xp: xpForRecalls(lifetime),
      dailyXp: dailyPace(xpForRecalls(recent)),
    };
  }
}
