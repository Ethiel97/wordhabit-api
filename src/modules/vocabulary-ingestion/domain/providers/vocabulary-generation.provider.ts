import type { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import type { PartOfSpeech } from '../../../vocabulary/domain/entities/part-of-speech';
import type { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';
import type { ExplorationBrief } from '../exploration-brief';

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

  /**
   * Terms the corpus already holds, so the model spends the batch on new
   * ground instead of rediscovering its own favourites — which the
   * uniqueness check would then reject one by one.
   */
  excludedTerms?: string[];

  /** The corner of the lexicon this batch explores. */
  brief?: ExplorationBrief;

  /**
   * Themes the corpus is thinnest on, so a batch fills its own gaps.
   *
   * The exploration brief says *how* to look and this says *where the
   * shelves are empty* — the brief comes from the calendar, this from
   * the corpus.
   */
  underCoveredThemes?: string[];
}

export interface GeneratedVocabularyBatch {
  items: GeneratedVocabularyWord[];
}

/**
 * Ceiling on one batch.
 *
 * Public because the caller builds the exploration brief — the
 * difficulty split and the expression quota have to add up to the count
 * actually requested, not the one asked for before capping.
 */
export const MAX_VOCABULARY_BATCH_SIZE = 30;

export const VOCABULARY_GENERATION_PROVIDER = Symbol(
  'VOCABULARY_GENERATION_PROVIDER',
);

export interface VocabularyGenerationProvider {
  generateVocabularyBatch(
    input: GenerateVocabularyBatchInput,
  ): Promise<GeneratedVocabularyBatch>;
}
