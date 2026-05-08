import { Command } from '@nestjs/cqrs';
import { GetActiveUserLearningProfileResult } from '../queries/get-active-user-learning-profile.query';

export class ActivateUserLearningProfileCommand extends Command<ActivateUserLearningProfileResult> {
  constructor(
    public readonly userId: string,
    public readonly profileId: string,
  ) {
    super();
  }
}

export type ActivateUserLearningProfileResult =
  GetActiveUserLearningProfileResult;
