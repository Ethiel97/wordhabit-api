import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  GetUserActivityQuery,
  GetUserActivityResult,
} from '../queries/get-user-activity.query';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';
import { shiftLocalDate } from '../../domain/services/local-date';

@QueryHandler(GetUserActivityQuery)
export class GetUserActivityHandler implements IQueryHandler<
  GetUserActivityQuery,
  GetUserActivityResult
> {
  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
  ) {}

  async execute(query: GetUserActivityQuery): Promise<GetUserActivityResult> {
    // `to` is the caller's own today, so the window needs no timezone
    // reasoning: step back over the calendar and hand both ends to a
    // string range.
    const from = shiftLocalDate(query.to, -(query.days - 1));

    const days = await this.learningRepository.findUserDailyActivity({
      userId: query.userId,
      from,
      to: query.to,
    });

    return {
      from,
      to: query.to,
      totalReviews: days.reduce((sum, day) => sum + day.reviewCount, 0),
      days,
    };
  }
}
