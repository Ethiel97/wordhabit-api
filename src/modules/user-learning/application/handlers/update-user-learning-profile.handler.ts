import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  UserLearningProfileAlreadyExistsError,
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

    // One profile per language, as the database enforces: switching to
    // a language the learner already holds is a conflict, not a crash.
    if (
      command.targetLanguage &&
      command.targetLanguage !== foundProfile.targetLanguage
    ) {
      const holder = await this.userLearningRepository.findUserLearningProfile({
        userId: command.userId,
        targetLanguage: command.targetLanguage,
      });
      if (holder) {
        throw new UserLearningProfileAlreadyExistsError(holder.targetLanguage);
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
      },
    );

    return { ...updated, readOnly: false };
  }
}
