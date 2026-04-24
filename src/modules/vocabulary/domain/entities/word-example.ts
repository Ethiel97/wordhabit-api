import { LanguageCode } from './language-code';

export interface WordExample {
  id: string;
  wordId: string;
  sentence: string;
  translation: string | null;
  translationLanguage: LanguageCode | null;
  createdAt: Date;
}
