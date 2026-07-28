import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';

export interface UserLearningProfile {
  id: string;
  userId: string;
  isActive: boolean;
  interfaceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  /** Absent on profiles created before setup asked for a level. */
  difficulty?: WordDifficulty;
  themeSlugs: string[];
  createdAt: Date;
  updatedAt: Date;
}
