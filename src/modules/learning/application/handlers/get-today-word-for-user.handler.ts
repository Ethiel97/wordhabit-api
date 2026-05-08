import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetTodayWordForUserQuery,
  GetTodayWordForUserResult,
} from '../queries/get-today-word-for-user.query';
import type { UserLearningRepository } from '../../../user-learning/domain/repositories/user-learning.repository';
import { USER_LEARNING_REPOSITORY } from '../../../user-learning/domain/repositories/user-learning.repository';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';

import { Inject } from '@nestjs/common';
import { UserLearningProfileNotFoundError } from '../../../user-learning/application/errors/user-learning-profile-not-found.error';
import { CandidateWordNotFoundError } from '../errors/candidate-word-not-found.error';

@QueryHandler(GetTodayWordForUserQuery)
export class GetTodayWordForUserHandler implements IQueryHandler<
  GetTodayWordForUserQuery,
  GetTodayWordForUserResult
> {
  constructor(
    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
  ) {}

  async execute(
    query: GetTodayWordForUserQuery,
  ): Promise<GetTodayWordForUserResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assignment = await this.learningRepository.findTodayAssignment({
      userId: query.userId,
      assignedFor: today,
    });

    if (assignment) {
      return assignment;
    }

    const profile =
      await this.userLearningRepository.findActiveUserLearningProfile(
        query.userId,
      );

    if (!profile) {
      throw new UserLearningProfileNotFoundError(
        'User learning profile not found.',
        { userId: query.userId },
      );
    }

    const word = await this.learningRepository.findCandidateWord(profile);

    if (!word) {
      throw new CandidateWordNotFoundError(
        'No candidate word found for the user learning profile.',
        { userId: query.userId },
      );
    }

    return this.learningRepository.createDailyAssignment({
      userId: query.userId,
      assignedFor: today,
      wordId: word.id,
      userLearningProfileId: profile.id,
    });
  }
}
