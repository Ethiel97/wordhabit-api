import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { WordLibraryRepository } from '../../domain/repositories/learning.repository';
import { WORD_LIBRARY_REPOSITORY } from '../../domain/repositories/learning.repository';
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
    @Inject(WORD_LIBRARY_REPOSITORY)
    private readonly libraryRepository: WordLibraryRepository,
  ) {}

  async execute(
    query: GetUserFavoriteWordsQuery,
  ): Promise<GetUserFavoriteWordsResult> {
    const favoriteWords = await this.libraryRepository.findUserFavoriteWords(
      query.userId,
    );
    return { favoriteWords };
  }
}
