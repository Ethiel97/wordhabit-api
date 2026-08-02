import {
  LEARNING_REPOSITORY,
  type LearningRepository,
  TodayWordAssignment,
} from '../../domain/repositories/learning.repository';
import { Inject, Injectable } from '@nestjs/common';
import { localDateToInstant } from '../../domain/services/local-date';
import { UserLearningProfileNotFoundError } from '../../../user-learning/application/errors/user-learning-profile-not-found.error';
import { CandidateWordNotFoundError } from '../errors/candidate-word-not-found.error';
import {
  USER_LEARNING_REPOSITORY,
  type UserLearningRepository,
} from '../../../user-learning/domain/repositories/user-learning.repository';

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
    const today = localDateToInstant(localDate);

    const assignment = await this.learningRepository.findTodayAssignment({
      userId,
      assignedFor: today,
    });

    if (assignment) {
      return assignment;
    }

    const profile =
      await this.userLearningRepository.findActiveUserLearningProfile(userId);

    if (!profile) {
      throw new UserLearningProfileNotFoundError(
        'User learning profile not found.',
        { userId },
      );
    }

    const word = await this.learningRepository.findCandidateWord(profile);

    if (!word) {
      throw new CandidateWordNotFoundError(
        'No candidate word found for the user learning profile.',
        { userId },
      );
    }

    return this.learningRepository.createDailyAssignment({
      userId,
      assignedFor: today,
      wordId: word.id,
      userLearningProfileId: profile.id,
    });
  }
}
