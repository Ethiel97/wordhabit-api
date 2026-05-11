import { GetActiveUserLearningProfileResult } from './get-active-user-learning-profile.query';
import { Query } from '@nestjs/cqrs';

export class GetUserLearningProfilesQuery extends Query<GetUserLearningProfilesResult> {
  constructor(public readonly userId: string) {
    super();
  }
}

export type GetUserLearningProfilesResult =
  GetActiveUserLearningProfileResult[];
