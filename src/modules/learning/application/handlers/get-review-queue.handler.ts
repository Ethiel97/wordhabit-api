import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetReviewQueueQuery,
  GetReviewQueueResult,
} from '../queries/get-review-queue.query';
import { Inject } from '@nestjs/common';

import type { WordProgressRepository } from '../../domain/repositories/learning.repository';
import { WORD_PROGRESS_REPOSITORY } from '../../domain/repositories/learning.repository';
import {
  USER_LEARNING_REPOSITORY,
  type UserLearningRepository,
} from '../../../user-learning/domain/repositories/user-learning.repository';

@QueryHandler(GetReviewQueueQuery)
export class GetReviewQueueHandler implements IQueryHandler<
  GetReviewQueueQuery,
  GetReviewQueueResult
> {
  constructor(
    @Inject(WORD_PROGRESS_REPOSITORY)
    private readonly wordProgressRepository: WordProgressRepository,

    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,
  ) {}

  async execute(query: GetReviewQueueQuery): Promise<GetReviewQueueResult> {
    const { userId, localDate, limit } = query;

    // The queue follows the language on screen. Merging both would put a
    // Spanish word in front of someone practising English.
    const profile =
      await this.userLearningRepository.findActiveUserLearningProfile(userId);

    if (!profile) {
      return { items: [] };
    }

    const items = await this.wordProgressRepository.findReviewQueue({
      userId,
      targetLanguage: profile.targetLanguage,
      limit,
      localDate,
    });

    return {
      items,
    };
  }
}
