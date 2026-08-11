import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { UserLearningRepository } from '../../domain/repositories/user-learning.repository';
import { USER_LEARNING_REPOSITORY } from '../../domain/repositories/user-learning.repository';
import { Inject } from '@nestjs/common';
import {
  DeleteUserLearningProfileCommand,
  DeleteUserLearningProfileResult,
} from '../commands/delete-user-learning-profile.command';
import {
  UserLearningProfileMainProfileDeletionError,
  UserLearningProfileNotFoundError,
} from '../errors/user-learning-profile-errors';

@CommandHandler(DeleteUserLearningProfileCommand)
export class DeleteUserLearningProfileHandler implements ICommandHandler<
  DeleteUserLearningProfileCommand,
  DeleteUserLearningProfileResult
> {
  constructor(
    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,
  ) {}

  async execute(
    command: DeleteUserLearningProfileCommand,
  ): Promise<DeleteUserLearningProfileResult> {
    const foundProfile =
      await this.userLearningRepository.findUserLearningProfileById(
        command.profileId,
      );

    // Not found and not yours answer the same, so an id cannot be probed.
    if (!foundProfile || foundProfile.userId !== command.userId) {
      throw new UserLearningProfileNotFoundError(
        'User learning profile not found.',
        { profileId: command.profileId },
      );
    }

    if (foundProfile.isMain) {
      throw new UserLearningProfileMainProfileDeletionError(
        'Cannot delete main user learning profile.',
        { profileId: command.profileId },
      );
    }

    const result = await this.userLearningRepository.deleteUserLearningProfile(
      command.profileId,
    );

    // Deleting the profile in use would leave the learner with no active
    // one, and the dashboard has nowhere to read a word from.
    if (foundProfile.isActive) {
      const profiles =
        await this.userLearningRepository.findUserLearningProfiles({
          userId: command.userId,
        });
      const fallback = profiles.find((p) => p.isMain) ?? profiles[0];
      if (fallback) {
        await this.userLearningRepository.activateUserLearningProfile({
          userId: command.userId,
          profileId: fallback.id,
        });
      }
    }

    return { success: result };
  }
}
