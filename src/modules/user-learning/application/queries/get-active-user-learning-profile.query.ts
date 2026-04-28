import { Query } from '@nestjs/cqrs';

export class GetActiveUserLearningProfileQuery extends Query<GetActiveUserLearningProfileResult> {
  constructor(public readonly userId: string) {
    super();
  }
}

export interface GetActiveUserLearningProfileResult {
  id: string;
  userId: string;
  isActive: boolean;
  interfaceLanguage: string;
  targetLanguage: string;
  themeSlugs: string[];
  createdAt: Date;
  updatedAt: Date;
}
