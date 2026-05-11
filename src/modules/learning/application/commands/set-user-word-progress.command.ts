import { Command } from '@nestjs/cqrs';
import {
  UserWordProgressMasteryLevel,
  UserWordProgressStatus,
} from '../../domain/entities/user-word-progress';

export class SetUserWordProgressCommand extends Command<SetUserWordProgressStatusResult> {
  constructor(
    public readonly userId: string,
    public readonly wordId: string,
    public readonly status: UserWordProgressStatus,
  ) {
    super();
  }
}

export type SetUserWordProgressStatusResult = {
  userId: string;
  wordId: string;
  status: UserWordProgressStatus;
  masteryLevel: UserWordProgressMasteryLevel;
  nextReviewAt: Date | null;
  updatedAt: Date;
};
