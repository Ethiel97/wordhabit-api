import { Query } from '@nestjs/cqrs';
import {
  UserWordProgressMasteryLevel,
  UserWordProgressStatus,
} from '../../domain/entities/user-word-progress';

export class GetUserWordProgressQuery extends Query<GetUserWordProgressStatusResult> {
  constructor(
    public readonly userId: string,
    public readonly wordId: string,
  ) {
    super();
  }
}

export interface GetUserWordProgressStatusResult {
  userId: string;
  wordId: string;
  status: UserWordProgressStatus;
  masteryLevel: UserWordProgressMasteryLevel;
  nextReviewOn?: string | null;
  updatedAt?: Date;
}
