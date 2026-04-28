import { GetActiveUserLearningProfileResult } from '../queries/get-active-user-learning-profile.query';
import { Command } from '@nestjs/cqrs';

export class SetUserLearningProfileThemesCommand extends Command<SetUserLearningProfileThemesResult> {
  constructor(
    public readonly profileId: string,
    public readonly themeSlugs: string[],
  ) {
    super();
  }
}

export type SetUserLearningProfileThemesResult =
  GetActiveUserLearningProfileResult;
