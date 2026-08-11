import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ReminderSlotTakenError,
  UserLearningProfileNotFoundError,
  UserLearningProfileReadOnlyError,
} from '../errors/user-learning-profile-errors';

import {
  UpdateUserLearningProfileCommand,
  UpdateUserLearningProfileResult,
} from '../commands/update-user-learning-profile.command';
import type { UserLearningRepository } from '../../domain/repositories/user-learning.repository';
import { USER_LEARNING_REPOSITORY } from '../../domain/repositories/user-learning.repository';
import { Inject } from '@nestjs/common';
import { EnsureThemesExistService } from '../services/ensure-themes-exist.service';
import { SubscriptionService } from '../../../subscription/application/services/subscription.service';

@CommandHandler(UpdateUserLearningProfileCommand)
export class UpdateUserLearningProfileHandler implements ICommandHandler<
  UpdateUserLearningProfileCommand,
  UpdateUserLearningProfileResult
> {
  constructor(
    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,
    private readonly ensureThemesExistService: EnsureThemesExistService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async execute(
    command: UpdateUserLearningProfileCommand,
  ): Promise<UpdateUserLearningProfileResult> {
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

    // A lapsed subscription keeps every profile and freezes all but the
    // main one; switching to them is still allowed, editing is not.
    if (!foundProfile.isMain) {
      const isPro = await this.subscriptionService.isPro(command.userId);
      if (!isPro) {
        throw new UserLearningProfileReadOnlyError(command.profileId);
      }
    }

    if (command.reminderSlot) {
      const profiles =
        await this.userLearningRepository.findUserLearningProfiles({
          userId: command.userId,
        });
      const holder = profiles.find(
        (profile) =>
          profile.id !== command.profileId &&
          profile.reminderSlot === command.reminderSlot,
      );
      if (holder) {
        throw new ReminderSlotTakenError(
          command.reminderSlot,
          holder.targetLanguage,
        );
      }
    }

    // Undefined means "leave the themes alone", which is not the same
    // as an empty array — that one is a deliberate clear.
    const normalizedThemeSlugs = command.themeSlugs
      ? await this.ensureThemesExistService.normalizeAndEnsure(
          command.themeSlugs,
        )
      : undefined;

    const updated = await this.userLearningRepository.updateUserLearningProfile(
      {
        themeSlugs: normalizedThemeSlugs,
        interfaceLanguage: command.interfaceLanguage,
        targetLanguage: command.targetLanguage,
        profileId: command.profileId,
        difficulty: command.difficulty,
        reminderSlot: command.reminderSlot,
      },
    );

    return { ...updated, readOnly: false };
  }
}
