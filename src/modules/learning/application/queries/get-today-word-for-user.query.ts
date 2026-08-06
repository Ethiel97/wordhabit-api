import { Query } from '@nestjs/cqrs';
import { VocabularyWord } from '../../../vocabulary/domain/entities/vocabulary-word';

export class GetTodayWordForUserQuery extends Query<GetTodayWordForUserResult> {
  constructor(
    public readonly userId: string,
    /** The caller's own day, `yyyy-MM-dd`. */
    public readonly localDate: string,
  ) {
    super();
  }
}

export interface GetTodayWordForUserResult {
  assignmentId: string;
  /** The day the word belongs to, `yyyy-MM-dd`. */
  assignedFor: string;
  word: VocabularyWord;
}
