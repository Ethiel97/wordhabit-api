import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ActivateUserLearningProfileCommand,
  ActivateUserLearningProfileResult,
} from '../commands/activate-user-learning-profile.command';

import type { UserLearningRepository } from '../../domain/repositories/user-learning.repository';
import { USER_LEARNING_REPOSITORY } from '../../domain/repositories/user-learning.repository';
import { Inject } from '@nestjs/common';
import { UserLearningProfileNotFoundError } from '../errors/user-learning-profile-not-found.error';

@CommandHandler(ActivateUserLearningProfileCommand)
export class ActivateUserLearningProfileHandler implements ICommandHandler<
  ActivateUserLearningProfileCommand,
  ActivateUserLearningProfileResult
> {
  constructor(
    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningProfileRepository: UserLearningRepository,
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

    return this.userLearningProfileRepository.activateUserLearningProfile({
      userId,
      profileId,
    });
  }
}
