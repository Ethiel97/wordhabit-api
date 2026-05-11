import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetUserLearningProfilesQuery,
  GetUserLearningProfilesResult,
} from '../queries/get-user-learning-profiles.query';
import { Inject } from '@nestjs/common';
import type { UserLearningRepository } from '../../domain/repositories/user-learning.repository';
import { USER_LEARNING_REPOSITORY } from '../../domain/repositories/user-learning.repository';

@QueryHandler(GetUserLearningProfilesQuery)
export class GetUserLearningProfilesHandler implements IQueryHandler<
  GetUserLearningProfilesQuery,
  GetUserLearningProfilesResult
> {
  constructor(
    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,
  ) {}
  execute(
    query: GetUserLearningProfilesQuery,
  ): Promise<GetUserLearningProfilesResult> {
    const { userId } = query;

    return this.userLearningRepository.findUserLearningProfiles({
      userId,
    });
  }
}
