import { LanguageCode } from './language-code';
import { WordDifficulty } from './word-difficulty';
import { PartOfSpeech } from './part-of-speech';
import { VocabularyWordStatus } from './vocabulary-word-status';

export interface VocabularyWord {
  id: string;
  term: string;
  normalizedTerm: string;
  targetLanguage: LanguageCode;
  difficulty: WordDifficulty;
  partOfSpeech: PartOfSpeech;
  status: VocabularyWordStatus;
  createdAt: Date;
  updatedAt: Date;
}
