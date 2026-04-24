import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  CreateUserLearningProfileCommand,
  CreateUserLearningProfileResult,
} from '../commands/CreateUserLearningProfileCommand';
import type { UserLearningRepository } from '../../domain/repositories/user-learning.repository';
import { USER_LEARNING_REPOSITORY } from '../../domain/repositories/user-learning.repository';
import { ConflictException, Inject } from '@nestjs/common';

@CommandHandler(CreateUserLearningProfileCommand)
export class CreateUserLearningProfileHandler implements ICommandHandler<
  CreateUserLearningProfileCommand,
  CreateUserLearningProfileResult
> {
  constructor(
    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,
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
        username: command.username,
      }));

    const foundProfile =
      await this.userLearningRepository.findUserLearningProfile({
        userId: user.id,
        targetLanguage: command.targetLanguage,
      });

    if (foundProfile) {
      throw new ConflictException(
        'User learning profile for target language already exists',
      );
    }

    const profile = await this.userLearningRepository.createUserLearningProfile(
      {
        userId: user.id,
        targetLanguage: command.targetLanguage,
        interfaceLanguage: command.interfaceLanguage,
        themeSlugs: command.themeSlugs,
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
