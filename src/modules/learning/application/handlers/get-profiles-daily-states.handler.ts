import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import type { UserLearningRepository } from '../../../user-learning/domain/repositories/user-learning.repository';
import { USER_LEARNING_REPOSITORY } from '../../../user-learning/domain/repositories/user-learning.repository';
import {
  GetProfilesDailyStatesQuery,
  GetProfilesDailyStatesResult,
} from '../queries/get-profiles-daily-states.query';
import {
  LEARNING_REPOSITORY,
  type LearningRepository,
} from '../../domain/repositories/learning.repository';
import { localDateToInstant } from '../../domain/services/local-date';

/**
 * What the profile switcher shows per language: whether the day's word
 * exists and whether it has been answered.
 *
 * Every profile is returned, including those with no word yet, so the
 * caller renders a status for each rather than for the subset the
 * assignment table happens to hold.
 */
@QueryHandler(GetProfilesDailyStatesQuery)
export class GetProfilesDailyStatesHandler implements IQueryHandler<
  GetProfilesDailyStatesQuery,
  GetProfilesDailyStatesResult
> {
  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,

    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,
  ) {}

  async execute(
    query: GetProfilesDailyStatesQuery,
  ): Promise<GetProfilesDailyStatesResult> {
    const profiles = await this.userLearningRepository.findUserLearningProfiles(
      { userId: query.userId },
    );

    if (profiles.length === 0) return [];

    const profileIds = profiles.map((profile) => profile.id);

    const [states, counts] = await Promise.all([
      this.learningRepository.findProfileDayStates({
        userLearningProfileIds: profileIds,
        assignedFor: localDateToInstant(query.localDate),
      }),
      this.learningRepository.countWordsByProfile({
        userLearningProfileIds: profileIds,
      }),
    ]);

    const countByProfile = new Map(
      counts.map((row) => [row.userLearningProfileId, row.wordCount]),
    );

    const byProfile = new Map(
      states.map((state) => [state.userLearningProfileId, state]),
    );

    return profiles.map((profile) => {
      const state = byProfile.get(profile.id);
      return {
        profileId: profile.id,
        targetLanguage: profile.targetLanguage,
        wordId: state?.wordId ?? null,
        quizCompleted: state?.quizCompleted ?? false,
        wordCount: countByProfile.get(profile.id) ?? 0,
      };
    });
  }
}
