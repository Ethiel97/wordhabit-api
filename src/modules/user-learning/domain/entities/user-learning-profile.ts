import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';

export interface UserLearningProfile {
  id: string;
  userId: string;
  isActive: boolean;
  interfaceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  themeSlugs: string[];
  createdAt: Date;
  updatedAt: Date;
}
