import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  CreateUserLearningProfileCommand,
  CreateUserLearningProfileResult,
} from '../commands/create-user-learning-profile.command';
import type { UserLearningRepository } from '../../domain/repositories/user-learning.repository';
import { USER_LEARNING_REPOSITORY } from '../../domain/repositories/user-learning.repository';
import { Inject } from '@nestjs/common';
import { EnsureThemesExistService } from '../services/ensure-themes-exist.service';
import { SubscriptionService } from '../../../subscription/application/services/subscription.service';
import {
  ReminderSlotTakenError,
  UserLearningProfileAlreadyExistsError,
  UserLearningProfileLimitReachedError,
} from '../errors/user-learning-profile-errors';

const MAX_PROFILES_FREE = 1;
const MAX_PROFILES_PRO = 3;

@CommandHandler(CreateUserLearningProfileCommand)
export class CreateUserLearningProfileHandler implements ICommandHandler<
  CreateUserLearningProfileCommand,
  CreateUserLearningProfileResult
> {
  constructor(
    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,
    private readonly ensureThemesExistService: EnsureThemesExistService,
    private readonly subscriptionService: SubscriptionService,
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

    const isPro = await this.subscriptionService.isPro(user.id);

    const userProfiles =
      await this.userLearningRepository.findUserLearningProfiles({
        userId: user.id,
      });

    const limit = isPro ? MAX_PROFILES_PRO : MAX_PROFILES_FREE;

    if (userProfiles.length >= limit) {
      throw new UserLearningProfileLimitReachedError(limit, isPro);
    }

    // Guarded per (user, targetLanguage), which is what the database
    // enforces: a learner may hold one profile per language, and the
    // newest becomes the active one. Guarding per user would refuse a
    // second language the schema now allows.
    const foundProfile =
      await this.userLearningRepository.findUserLearningProfile({
        userId: user.id,
        targetLanguage: command.targetLanguage,
      });

    if (foundProfile) {
      throw new UserLearningProfileAlreadyExistsError(
        foundProfile.targetLanguage,
      );
    }

    // A partial unique index refuses this too; checking first is what
    // turns it into a message naming the language that holds the slot.
    if (command.reminderSlot) {
      const holder = userProfiles.find(
        (profile) => profile.reminderSlot === command.reminderSlot,
      );
      if (holder) {
        throw new ReminderSlotTakenError(
          command.reminderSlot,
          holder.targetLanguage,
        );
      }
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
        reminderSlot: command.reminderSlot,
        // Server-decided: the first profile is the one a downgrade keeps,
        // and a client that could name it would keep every language.
        isMain: userProfiles.length === 0,
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
      isMain: profile.isMain,
      reminderSlot: profile.reminderSlot,
    };
  }
}
