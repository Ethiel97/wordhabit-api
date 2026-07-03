import { UserWordLibraryItem } from '../../domain/repositories/learning.repository';
import { Query } from '@nestjs/cqrs';
import { UserWordProgressStatus } from '../../domain/entities/user-word-progress';

export const USER_WORD_LIBRARY_LIMIT = 20;
export class GetUserWordLibraryQuery extends Query<GetUserWordLibraryResult> {
  constructor(
    public readonly userId: string,
    public readonly status?: UserWordProgressStatus,
    public readonly search?: string,
    public readonly limit = USER_WORD_LIBRARY_LIMIT,
    public readonly cursor?: string,
  ) {
    super();
  }
}

export type GetUserWordLibraryResult = {
  items: UserWordLibraryItem[];
  nextCursor: string | null;
};
