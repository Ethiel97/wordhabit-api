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

    // Guarded per *user*, not per (user, targetLanguage).
    //
    // `UserLearningProfile.userId` is `@unique`, so the database allows
    // exactly one profile per user whatever the language. Checking the
    // pair let a second language slip past this guard and die on the
    // unique constraint instead — a 500 where the caller deserves a
    // 409 it can act on.
    const foundProfile =
      await this.userLearningRepository.findActiveUserLearningProfile(user.id);

    if (foundProfile) {
      throw new UserLearningProfileAlreadyExistsError(
        foundProfile.targetLanguage,
      );
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
        difficulty: command.difficulty,
        themeSlugs: normalizedThemeSlugs,
      },
    );
    return {
      createdAt: profile.createdAt,
      interfaceLanguage: profile.interfaceLanguage,
      isActive: profile.isActive,
      id: profile.id,
      targetLanguage: profile.targetLanguage,
      difficulty: profile.difficulty,
      themeSlugs: profile.themeSlugs,
      updatedAt: profile.updatedAt,
      userId: profile.userId,
    };
  }
}
