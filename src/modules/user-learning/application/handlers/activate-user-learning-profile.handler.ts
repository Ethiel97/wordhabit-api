import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ActivateUserLearningProfileCommand,
  ActivateUserLearningProfileResult,
} from '../commands/activate-user-learning-profile.command';
import { UserLearningProfileNotFoundError } from '../errors/user-learning-profile-errors';

import type { UserLearningRepository } from '../../domain/repositories/user-learning.repository';
import { USER_LEARNING_REPOSITORY } from '../../domain/repositories/user-learning.repository';
import { SubscriptionService } from '../../../subscription/application/services/subscription.service';
import { Inject } from '@nestjs/common';

@CommandHandler(ActivateUserLearningProfileCommand)
export class ActivateUserLearningProfileHandler implements ICommandHandler<
  ActivateUserLearningProfileCommand,
  ActivateUserLearningProfileResult
> {
  constructor(
    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningProfileRepository: UserLearningRepository,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async execute(
    command: ActivateUserLearningProfileCommand,
  ): Promise<ActivateUserLearningProfileResult> {
    const { userId, profileId } = command;

    const foundProfile =
      await this.userLearningProfileRepository.findUserLearningProfileById(
        profileId,
      );

    if (!foundProfile || foundProfile.userId !== userId) {
      throw new UserLearningProfileNotFoundError(
        'User learning profile not found.',
        { userId, profileId },
      );
    }

    // Switching to a frozen profile is allowed: the app shows it
    // read-only rather than pretending it is gone.
    const [activated, isPro] = await Promise.all([
      this.userLearningProfileRepository.activateUserLearningProfile({
        userId,
        profileId,
      }),
      this.subscriptionService.isPro(userId),
    ]);

    return { ...activated, readOnly: !isPro && !activated.isMain };
  }
}
