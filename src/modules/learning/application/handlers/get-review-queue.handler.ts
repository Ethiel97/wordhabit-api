import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetReviewQueueQuery,
  GetReviewQueueResult,
} from '../queries/get-review-queue.query';
import { Inject } from '@nestjs/common';

import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';

@QueryHandler(GetReviewQueueQuery)
export class GetReviewQueueHandler implements IQueryHandler<
  GetReviewQueueQuery,
  GetReviewQueueResult
> {
  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
  ) {}

  async execute(query: GetReviewQueueQuery): Promise<GetReviewQueueResult> {
    const { userId, localDate, limit } = query;

    const items = await this.learningRepository.findReviewQueue({
      userId,
      limit,
      localDate,
    });

    return {
      items,
    };
  }
}
