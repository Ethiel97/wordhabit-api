import {
  LEARNING_REPOSITORY,
  type LearningRepository,
  TodayWordAssignment,
} from '../../domain/repositories/learning.repository';
import { Inject, Injectable } from '@nestjs/common';
import { localDateToInstant } from '../../domain/services/local-date';
import { CandidateWordNotFoundError } from '../errors/candidate-word-not-found.error';
import {
  USER_LEARNING_REPOSITORY,
  type UserLearningRepository,
} from '../../../user-learning/domain/repositories/user-learning.repository';
import type { UserLearningProfile } from '../../../user-learning/domain/entities/user-learning-profile';
import { UserLearningProfileNotFoundError } from '../../../user-learning/application/errors/user-learning-profile-errors';

@Injectable()
export class TodayWordService {
  constructor(
    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,

    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
  ) {}

  /**
   * [localDate] is the caller's own day, `yyyy-MM-dd` — supplied, never
   * derived. Read from the server's clock it would name a different day
   * for anyone far from its timezone, and the notification worker would
   * announce a word the app does not consider today's.
   */
  async getOrAssignTodayWord(
    userId: string,
    localDate: string,
  ): Promise<TodayWordAssignment> {
    const profile =
      await this.userLearningRepository.findActiveUserLearningProfile(userId);

    if (!profile) {
      throw new UserLearningProfileNotFoundError(
        'User learning profile not found.',
        { userId },
      );
    }

    return this.getOrAssignForProfile(profile, localDate);
  }

  /** For callers holding an id, such as the notification sweep. */
  async getOrAssignForProfileId(
    profileId: string,
    localDate: string,
  ): Promise<TodayWordAssignment> {
    const profile =
      await this.userLearningRepository.findUserLearningProfileById(profileId);

    if (!profile) {
      throw new UserLearningProfileNotFoundError(
        'User learning profile not found.',
        { profileId },
      );
    }

    return this.getOrAssignForProfile(profile, localDate);
  }

  /**
   * One word per profile per day. Callers that already hold the profile
   * come here directly: the notification sweep announces a named
   * profile's word, and resolving the active one there would announce
   * whichever language the learner last opened.
   */
  async getOrAssignForProfile(
    profile: UserLearningProfile,
    localDate: string,
  ): Promise<TodayWordAssignment> {
    const today = localDateToInstant(localDate);

    const assignment = await this.learningRepository.findTodayAssignment({
      userLearningProfileId: profile.id,
      assignedFor: today,
    });

    if (assignment) {
      return assignment;
    }

    const word = await this.learningRepository.findCandidateWord(profile);

    if (!word) {
      throw new CandidateWordNotFoundError(
        'No candidate word found for the user learning profile.',
        { userId: profile.userId, profileId: profile.id },
      );
    }

    return this.learningRepository.createDailyAssignment({
      userId: profile.userId,
      assignedFor: today,
      wordId: word.id,
      userLearningProfileId: profile.id,
    });
  }
}
