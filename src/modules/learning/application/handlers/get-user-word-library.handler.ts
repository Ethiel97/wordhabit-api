import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';
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
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
  ) {}

  async execute(
    query: GetUserWordLibraryQuery,
  ): Promise<GetUserWordLibraryResult> {
    return await this.learningRepository.findUserWordLibrary({
      userId: query.userId,
      status: query.status,
      search: query.search,
      limit: query.limit,
      cursor: query.cursor,
    });
  }
}
