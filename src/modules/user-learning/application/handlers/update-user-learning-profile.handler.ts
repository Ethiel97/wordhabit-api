import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import {
  UpdateUserLearningProfileCommand,
  UpdateUserLearningProfileResult,
} from '../commands/update-user-learning-profile.command';
import type { UserLearningRepository } from '../../domain/repositories/user-learning.repository';
import { USER_LEARNING_REPOSITORY } from '../../domain/repositories/user-learning.repository';
import { Inject } from '@nestjs/common';
import { EnsureThemesExistService } from '../services/ensure-themes-exist.service';
import { UserLearningProfileNotFoundError } from '../errors/user-learning-profile-not-found.error';

@CommandHandler(UpdateUserLearningProfileCommand)
export class UpdateUserLearningProfileHandler implements ICommandHandler<
  UpdateUserLearningProfileCommand,
  UpdateUserLearningProfileResult
> {
  constructor(
    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,
    private readonly ensureThemesExistService: EnsureThemesExistService,
  ) {}

  async execute(
    command: UpdateUserLearningProfileCommand,
  ): Promise<UpdateUserLearningProfileResult> {
    const foundProfile =
      await this.userLearningRepository.findUserLearningProfileById(
        command.profileId,
      );

    if (!foundProfile) {
      throw new UserLearningProfileNotFoundError(
        'User learning profile not found.',
        { profileId: command.profileId },
      );
    }

    // Undefined means "leave the themes alone", which is not the same
    // as an empty array — that one is a deliberate clear.
    const normalizedThemeSlugs = command.themeSlugs
      ? await this.ensureThemesExistService.normalizeAndEnsure(
          command.themeSlugs,
        )
      : undefined;

    return this.userLearningRepository.updateUserLearningProfile({
      themeSlugs: normalizedThemeSlugs,
      interfaceLanguage: command.interfaceLanguage,
      targetLanguage: command.targetLanguage,
      profileId: command.profileId,
      difficulty: command.difficulty,
    });
  }
}
