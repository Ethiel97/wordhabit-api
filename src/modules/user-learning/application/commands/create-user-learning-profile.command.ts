import { Command } from '@nestjs/cqrs';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';
import { NotificationSlot } from '../../../notifications/domain/entities/notification';

export class CreateUserLearningProfileCommand extends Command<CreateUserLearningProfileResult> {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly interfaceLanguage: LanguageCode,
    public readonly targetLanguage: LanguageCode,
    public readonly themeSlugs: string[],
    public readonly difficulty?: WordDifficulty,
    public readonly reminderSlot?: NotificationSlot,
  ) {
    super();
  }
}

export interface CreateUserLearningProfileResult {
  id: string;
  userId: string;
  isActive: boolean;
  interfaceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  difficulty?: WordDifficulty;
  reminderSlot?: NotificationSlot;
  themeSlugs: string[];
  isMain: boolean;
  createdAt: Date;
  updatedAt: Date;
}
