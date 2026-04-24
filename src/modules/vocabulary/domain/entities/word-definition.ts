import { LanguageCode } from './language-code';

export interface WordDefinition {
  id: string;
  wordId: string;
  explanationLanguage: LanguageCode;
  text: string;
  register: string | null;
  createdAt: Date;
}
