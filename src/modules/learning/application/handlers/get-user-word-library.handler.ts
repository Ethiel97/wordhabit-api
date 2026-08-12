import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import type { WordLibraryRepository } from '../../domain/repositories/learning.repository';
import { WORD_LIBRARY_REPOSITORY } from '../../domain/repositories/learning.repository';
import {
  GetUserWordLibraryQuery,
  GetUserWordLibraryResult,
} from '../queries/get-user-word-library.query';

@QueryHandler(GetUserWordLibraryQuery)
export class GetUserWordLibraryHandler implements IQueryHandler<
  GetUserWordLibraryQuery,
  GetUserWordLibraryResult
> {
  constructor(
    @Inject(WORD_LIBRARY_REPOSITORY)
    private readonly libraryRepository: WordLibraryRepository,
  ) {}

  async execute(
    query: GetUserWordLibraryQuery,
  ): Promise<GetUserWordLibraryResult> {
    return await this.libraryRepository.findUserWordLibrary({
      userId: query.userId,
      status: query.status,
      search: query.search,
      limit: query.limit,
      cursor: query.cursor,
    });
  }
}
