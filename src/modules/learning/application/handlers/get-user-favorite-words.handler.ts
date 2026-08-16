import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { WordLibraryRepository } from '../../domain/repositories/learning.repository';
import { WORD_LIBRARY_REPOSITORY } from '../../domain/repositories/learning.repository';
import {
  GetUserFavoriteWordsQuery,
  GetUserFavoriteWordsResult,
} from '../queries/get-user-favorite-words.query';
import {
  USER_LEARNING_REPOSITORY,
  type UserLearningRepository,
} from '../../../user-learning/domain/repositories/user-learning.repository';

@QueryHandler(GetUserFavoriteWordsQuery)
export class GetUserFavoriteWordsHandler implements IQueryHandler<
  GetUserFavoriteWordsQuery,
  GetUserFavoriteWordsResult
> {
  constructor(
    @Inject(WORD_LIBRARY_REPOSITORY)
    private readonly libraryRepository: WordLibraryRepository,

    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,
  ) {}

  async execute(
    query: GetUserFavoriteWordsQuery,
  ): Promise<GetUserFavoriteWordsResult> {
    const profile =
      await this.userLearningRepository.findActiveUserLearningProfile(
        query.userId,
      );

    if (!profile) return { favoriteWords: [] };

    const favoriteWords = await this.libraryRepository.findUserFavoriteWords({
      userId: query.userId,
      targetLanguage: profile.targetLanguage,
    });
    return { favoriteWords };
  }
}
