import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ReminderSlotTakenError,
  UserLearningProfileNotFoundError,
  UserLearningProfileReadOnlyError,
} from '../errors/user-learning-profile-errors';
import type { UserLearningRepository } from '../../domain/repositories/user-learning.repository';
import { USER_LEARNING_REPOSITORY } from '../../domain/repositories/user-learning.repository';
import { Inject } from '@nestjs/common';
import { EnsureThemesExistService } from '../services/ensure-themes-exist.service';
import { SubscriptionService } from '../../../subscription/application/services/subscription.service';
import {
  SwapReminderCommandResult,
  SwapReminderSlotCommand,
} from '../commands/swap-reminder-slot.command';

@CommandHandler(SwapReminderSlotCommand)
export class SwapReminderSlotHandler implements ICommandHandler<
  SwapReminderSlotCommand,
  SwapReminderCommandResult
> {
  constructor(
    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,
    private readonly ensureThemesExistService: EnsureThemesExistService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async execute(
    command: SwapReminderSlotCommand,
  ): Promise<SwapReminderCommandResult> {
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

    const isPro = await this.subscriptionService.isPro(command.userId);

    // A lapsed subscription keeps every profile and freezes all but the
    // main one; switching to them is still allowed, editing is not.
    if (!foundProfile.isMain && !isPro) {
      throw new UserLearningProfileReadOnlyError(command.profileId);
    }

    // The holder is edited too — it inherits the slot being vacated — so
    // it has to be editable as well. Without this a lapsed account could
    // move a frozen profile's reminder by trading from the main one, and
    // never move it back: the frozen profile refuses every direct edit
    // while still receiving its daily word at the new hour.
    if (!isPro) {
      const profiles =
        await this.userLearningRepository.findUserLearningProfiles({
          userId: command.userId,
        });
      const holder = profiles.find(
        (profile) =>
          profile.id !== command.profileId &&
          profile.reminderSlot === command.reminderSlot,
      );
      if (holder && !holder.isMain) {
        throw new ReminderSlotTakenError(
          command.reminderSlot,
          holder.targetLanguage,
        );
      }
    }

    const updated = await this.userLearningRepository.swapReminderSlot({
      userId: command.userId,
      profileId: command.profileId,
      reminderSlot: command.reminderSlot,
    });

    return { ...updated, readOnly: false };
  }
}
