import type { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import type { PartOfSpeech } from '../../../vocabulary/domain/entities/part-of-speech';
import type { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';

export interface GeneratedVocabularyDefinition {
  explanationLanguage: LanguageCode;
  text: string;
  register?: string;
}

export interface GeneratedVocabularyExample {
  sentence: string;
  translation?: string;
  translationLanguage?: LanguageCode;
}

export interface GeneratedVocabularyPronunciation {
  phonetic?: string;
  audioUrl?: string;
  provider?: string;
}

export interface GeneratedVocabularySynonym {
  value: string;
}

export interface GeneratedVocabularyWord {
  term: string;
  targetLanguage: LanguageCode;
  difficulty: WordDifficulty;
  partOfSpeech: PartOfSpeech;
  definitions: GeneratedVocabularyDefinition[];
  examples: GeneratedVocabularyExample[];
  pronunciations: GeneratedVocabularyPronunciation[];
  synonyms: GeneratedVocabularySynonym[];
  themeSlugs: string[];
}

export interface GenerateVocabularyBatchInput {
  targetLanguage: LanguageCode;
  explanationLanguage?: LanguageCode;
  count: number;
  allowedThemeSlugs?: string[];
}

export interface GeneratedVocabularyBatch {
  items: GeneratedVocabularyWord[];
}

export const VOCABULARY_GENERATION_PROVIDER = Symbol(
  'VOCABULARY_GENERATION_PROVIDER',
);

export interface VocabularyGenerationProvider {
  generateVocabularyBatch(
    input: GenerateVocabularyBatchInput,
  ): Promise<GeneratedVocabularyBatch>;
}
