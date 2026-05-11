import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import {
  SetUserLearningProfileThemesCommand,
  SetUserLearningProfileThemesResult,
} from '../commands/set-user-learning-profile-themes.command';
import type { UserLearningRepository } from '../../domain/repositories/user-learning.repository';
import { USER_LEARNING_REPOSITORY } from '../../domain/repositories/user-learning.repository';
import { Inject } from '@nestjs/common';
import { EnsureThemesExistService } from '../services/ensure-themes-exist.service';
import { UserLearningProfileNotFoundError } from '../errors/user-learning-profile-not-found.error';

@CommandHandler(SetUserLearningProfileThemesCommand)
export class SetUserLearningProfileThemesHandler implements ICommandHandler<
  SetUserLearningProfileThemesCommand,
  SetUserLearningProfileThemesResult
> {
  constructor(
    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,
    private readonly ensureThemesExistService: EnsureThemesExistService,
  ) {}

  async execute(
    command: SetUserLearningProfileThemesCommand,
  ): Promise<SetUserLearningProfileThemesResult> {
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

    const normalizedThemeSlugs =
      await this.ensureThemesExistService.normalizeAndEnsure(
        command.themeSlugs,
      );

    return this.userLearningRepository.setUserLearningProfileThemes({
      themeSlugs: normalizedThemeSlugs,
      profileId: command.profileId,
    });
  }
}
