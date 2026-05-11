import {
  GetUserWordProgressQuery,
  GetUserWordProgressStatusResult,
} from '../queries/get-user-word-progress.query';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  UserWordProgressMasteryLevel,
  UserWordProgressStatus,
} from '../../domain/entities/user-word-progress';
import { Inject } from '@nestjs/common';

@QueryHandler(GetUserWordProgressQuery)
export class GetUserWordProgressHandler implements IQueryHandler<
  GetUserWordProgressQuery,
  UserWordProgressStatus
> {
  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
  ) {}

  async execute(
    query: GetUserWordProgressQuery,
  ): Promise<GetUserWordProgressStatusResult> {
    const { userId, wordId } = query;
    const progress = await this.learningRepository.findUserWordProgress({
      userId,
      wordId,
    });

    if (!progress) {
      return {
        userId,
        wordId,
        status: UserWordProgressStatus.NEW,
        masteryLevel: UserWordProgressMasteryLevel.SKIPPED,
        nextReviewAt: null,
      };
    }

    return {
      userId,
      wordId,
      status: progress.status,
      masteryLevel: progress.masteryLevel,
      nextReviewAt: progress.nextReviewAt,
      updatedAt: progress.updatedAt,
    };
  }
}
