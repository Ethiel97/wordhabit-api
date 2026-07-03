import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';
import {
  GetUserFavoriteWordsQuery,
  GetUserFavoriteWordsResult,
} from '../queries/get-user-favorite-words.query';

@QueryHandler(GetUserFavoriteWordsQuery)
export class GetUserFavoriteWordsHandler implements IQueryHandler<
  GetUserFavoriteWordsQuery,
  GetUserFavoriteWordsResult
> {
  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
  ) {}

  async execute(
    query: GetUserFavoriteWordsQuery,
  ): Promise<GetUserFavoriteWordsResult> {
    const favoriteWords = await this.learningRepository.findUserFavoriteWords(
      query.userId,
    );
    return { favoriteWords };
  }
}
