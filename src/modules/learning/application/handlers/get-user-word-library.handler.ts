import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import type { WordLibraryRepository } from '../../domain/repositories/learning.repository';
import {
  emptyUserWordLibrary,
  WORD_LIBRARY_REPOSITORY,
} from '../../domain/repositories/learning.repository';
import {
  GetUserWordLibraryQuery,
  GetUserWordLibraryResult,
} from '../queries/get-user-word-library.query';
import {
  USER_LEARNING_REPOSITORY,
  type UserLearningRepository,
} from '../../../user-learning/domain/repositories/user-learning.repository';

@QueryHandler(GetUserWordLibraryQuery)
export class GetUserWordLibraryHandler implements IQueryHandler<
  GetUserWordLibraryQuery,
  GetUserWordLibraryResult
> {
  constructor(
    @Inject(WORD_LIBRARY_REPOSITORY)
    private readonly libraryRepository: WordLibraryRepository,

    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,
  ) {}

  async execute(
    query: GetUserWordLibraryQuery,
  ): Promise<GetUserWordLibraryResult> {
    // One language's collection, so the mastery figures above the list
    // describe what the learner is looking at.
    const profile =
      await this.userLearningRepository.findActiveUserLearningProfile(
        query.userId,
      );

    if (!profile) {
      return emptyUserWordLibrary();
    }

    return await this.libraryRepository.findUserWordLibrary({
      userId: query.userId,
      targetLanguage: profile.targetLanguage,
      status: query.status,
      search: query.search,
      savedOnly: query.savedOnly,
      limit: query.limit,
      cursor: query.cursor,
    });
  }
}
