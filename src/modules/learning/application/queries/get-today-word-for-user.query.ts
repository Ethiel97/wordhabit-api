import { Query } from '@nestjs/cqrs';
import { VocabularyWord } from '../../../../../generated/prisma/client';

export class GetTodayWordForUserQuery extends Query<GetTodayWordForUserResult> {
  constructor(public readonly userId: string) {
    super();
  }
}

export interface GetTodayWordForUserResult {
  assignmentId: string;
  assignedFor: Date;
  word: VocabularyWord;
}
