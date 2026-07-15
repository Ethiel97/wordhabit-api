import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  CreateUserLearningProfileCommand,
  CreateUserLearningProfileResult,
} from '../commands/create-user-learning-profile.command';
import type { UserLearningRepository } from '../../domain/repositories/user-learning.repository';
import { USER_LEARNING_REPOSITORY } from '../../domain/repositories/user-learning.repository';
import { Inject } from '@nestjs/common';
import { EnsureThemesExistService } from '../services/ensure-themes-exist.service';
import { UserLearningProfileAlreadyExistsError } from '../errors/user-learning-profile-already-exists.error';

@CommandHandler(CreateUserLearningProfileCommand)
export class CreateUserLearningProfileHandler implements ICommandHandler<
  CreateUserLearningProfileCommand,
  CreateUserLearningProfileResult
> {
  constructor(
    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,
    private readonly ensureThemesExistService: EnsureThemesExistService,
  ) {}

  async execute(
    command: CreateUserLearningProfileCommand,
  ): Promise<CreateUserLearningProfileResult> {
    const foundUser = await this.userLearningRepository.findUserByEmail(
      command.email,
    );

    const user =
      foundUser ??
      (await this.userLearningRepository.createUser({
        email: command.email,
        name: command.name,
      }));

    const foundProfile =
      await this.userLearningRepository.findUserLearningProfile({
        userId: user.id,
        targetLanguage: command.targetLanguage,
      });

    if (foundProfile) {
      throw new UserLearningProfileAlreadyExistsError(command.targetLanguage);
    }

    const normalizedThemeSlugs =
      await this.ensureThemesExistService.normalizeAndEnsure(
        command.themeSlugs,
      );

    const profile = await this.userLearningRepository.createUserLearningProfile(
      {
        userId: user.id,
        targetLanguage: command.targetLanguage,
        interfaceLanguage: command.interfaceLanguage,
        themeSlugs: normalizedThemeSlugs,
      },
    );
    return {
      createdAt: profile.createdAt,
      interfaceLanguage: profile.interfaceLanguage,
      isActive: profile.isActive,
      learningProfileId: profile.id,
      targetLanguage: profile.targetLanguage,
      themeSlugs: profile.themeSlugs,
      updatedAt: profile.updatedAt,
      userId: profile.userId,
    };
  }
}
