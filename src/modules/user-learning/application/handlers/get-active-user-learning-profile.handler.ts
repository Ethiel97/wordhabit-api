import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetActiveUserLearningProfileQuery,
  GetActiveUserLearningProfileResult,
} from '../queries/get-active-user-learning-profile.query';
import type { UserLearningRepository } from '../../domain/repositories/user-learning.repository';
import { USER_LEARNING_REPOSITORY } from '../../domain/repositories/user-learning.repository';
import { Inject } from '@nestjs/common';
import { SubscriptionService } from '../../../subscription/application/services/subscription.service';
import { UserLearningProfileNotFoundError } from '../errors/user-learning-profile-errors';

@QueryHandler(GetActiveUserLearningProfileQuery)
export class GetActiveUserLearningProfileHandler implements IQueryHandler<
  GetActiveUserLearningProfileQuery,
  GetActiveUserLearningProfileResult
> {
  constructor(
    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningProfileRepository: UserLearningRepository,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async execute(
    query: GetActiveUserLearningProfileQuery,
  ): Promise<GetActiveUserLearningProfileResult> {
    const { userId } = query;

    const found =
      await this.userLearningProfileRepository.findActiveUserLearningProfile(
        userId,
      );

    if (!found) {
      throw new UserLearningProfileNotFoundError(
        `No active learning profile found for user with ID ${userId}`,
        { userId },
      );
    }

    const isPro = await this.subscriptionService.isPro(userId);

    return { ...found, readOnly: !isPro && !found.isMain };
  }
}
