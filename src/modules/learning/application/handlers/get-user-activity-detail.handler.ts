import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BadRequestException, Inject } from '@nestjs/common';
import {
  GetUserActivityDetailQuery,
  GetUserActivityDetailResult,
} from '../queries/get-user-activity-detail.query';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';

@QueryHandler(GetUserActivityDetailQuery)
export class GetUserActivityDetailHandler implements IQueryHandler<
  GetUserActivityDetailQuery,
  GetUserActivityDetailResult
> {
  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
  ) {}

  async execute(
    query: GetUserActivityDetailQuery,
  ): Promise<GetUserActivityDetailResult> {
    // Both bounds are already the days the client tapped, and ISO dates
    // compare as text, so the only thing worth checking is the ordering.
    if (query.to < query.from) {
      throw new BadRequestException('to must not precede from.');
    }

    const detail = await this.learningRepository.findUserActivityDetail({
      userId: query.userId,
      from: query.from,
      to: query.to,
      limit: query.limit,
    });

    return { from: query.from, to: query.to, ...detail };
  }
}
