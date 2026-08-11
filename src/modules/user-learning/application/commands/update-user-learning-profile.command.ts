import { GetActiveUserLearningProfileResult } from '../queries/get-active-user-learning-profile.query';
import { Command } from '@nestjs/cqrs';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';
import { NotificationSlot } from '../../../notifications/domain/entities/notification';

export class UpdateUserLearningProfileCommand extends Command<UpdateUserLearningProfileResult> {
  constructor(
    public readonly userId: string,
    public readonly profileId: string,
    public readonly themeSlugs?: string[],
    public readonly interfaceLanguage?: LanguageCode,
    public readonly targetLanguage?: LanguageCode,
    public readonly difficulty?: WordDifficulty,
    public readonly reminderSlot?: NotificationSlot | null,
  ) {
    super();
  }
}

export type UpdateUserLearningProfileResult =
  GetActiveUserLearningProfileResult;
