import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  GetUserActivityQuery,
  GetUserActivityResult,
} from '../queries/get-user-activity.query';
import type { LearnerProgressRepository } from '../../domain/repositories/learning.repository';
import { LEARNER_PROGRESS_REPOSITORY } from '../../domain/repositories/learning.repository';
import { shiftLocalDate } from '../../domain/services/local-date';

@QueryHandler(GetUserActivityQuery)
export class GetUserActivityHandler implements IQueryHandler<
  GetUserActivityQuery,
  GetUserActivityResult
> {
  constructor(
    @Inject(LEARNER_PROGRESS_REPOSITORY)
    private readonly progressRepository: LearnerProgressRepository,
  ) {}

  async execute(query: GetUserActivityQuery): Promise<GetUserActivityResult> {
    // `to` is the caller's own today, so the window needs no timezone
    // reasoning: step back over the calendar and hand both ends to a
    // string range.
    const from = shiftLocalDate(query.to, -(query.days - 1));

    // Both ranges are the same window, so they run together rather than
    // in sequence: the heatmap is the first thing the progress screen
    // draws.
    const [days, repairedDays] = await Promise.all([
      this.progressRepository.findUserDailyActivity({
        userId: query.userId,
        from,
        to: query.to,
      }),
      this.progressRepository.findStreakRepairs({
        userId: query.userId,
        from,
        to: query.to,
      }),
    ]);

    return {
      from,
      to: query.to,
      // Counted on real reviews only: a bought day did not earn one.
      totalReviews: days.reduce((sum, day) => sum + day.reviewCount, 0),
      days,
      repairedDays,
    };
  }
}
