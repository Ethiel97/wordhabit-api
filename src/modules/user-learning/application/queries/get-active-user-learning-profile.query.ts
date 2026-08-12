import { Query } from '@nestjs/cqrs';
import { NotificationSlot } from '../../../notifications/domain/entities/notification';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';

export class GetActiveUserLearningProfileQuery extends Query<GetActiveUserLearningProfileResult> {
  constructor(public readonly userId: string) {
    super();
  }
}

export interface GetActiveUserLearningProfileResult {
  id: string;
  userId: string;
  isActive: boolean;
  isMain: boolean;
  interfaceLanguage: string;
  targetLanguage: string;
  difficulty?: WordDifficulty;
  reminderSlot?: NotificationSlot;
  /** Derived from the tier, never stored: a lapsed subscription keeps
   * every profile but only the main one stays writable. */
  readOnly: boolean;
  themeSlugs: string[];
  createdAt: Date;
  updatedAt: Date;
}
