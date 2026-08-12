import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';
import { NotificationSlot } from '../../../notifications/domain/entities/notification';

export interface UserLearningProfile {
  id: string;
  userId: string;
  isActive: boolean;
  isMain: boolean;
  interfaceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  /** Absent on profiles created before setup asked for a level. */
  difficulty?: WordDifficulty;
  /** When this profile's word is announced; unique per user. */
  reminderSlot?: NotificationSlot;
  themeSlugs: string[];
  createdAt: Date;
  updatedAt: Date;
}
