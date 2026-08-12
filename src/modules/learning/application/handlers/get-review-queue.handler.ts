import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetReviewQueueQuery,
  GetReviewQueueResult,
} from '../queries/get-review-queue.query';
import { Inject } from '@nestjs/common';

import type { WordProgressRepository } from '../../domain/repositories/learning.repository';
import { WORD_PROGRESS_REPOSITORY } from '../../domain/repositories/learning.repository';

@QueryHandler(GetReviewQueueQuery)
export class GetReviewQueueHandler implements IQueryHandler<
  GetReviewQueueQuery,
  GetReviewQueueResult
> {
  constructor(
    @Inject(WORD_PROGRESS_REPOSITORY)
    private readonly wordProgressRepository: WordProgressRepository,
  ) {}

  async execute(query: GetReviewQueueQuery): Promise<GetReviewQueueResult> {
    const { userId, localDate, limit } = query;

    const items = await this.wordProgressRepository.findReviewQueue({
      userId,
      limit,
      localDate,
    });

    return {
      items,
    };
  }
}
