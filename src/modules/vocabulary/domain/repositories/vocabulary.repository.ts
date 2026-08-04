import { LanguageCode } from '../entities/language-code';
import { WordDifficulty } from '../entities/word-difficulty';
import { PartOfSpeech } from '../entities/part-of-speech';
import { VocabularyWord } from '../entities/vocabulary-word';
import { WordDefinition } from '../entities/word-definition';
import { WordExample } from '../entities/word-example';
import { WordPronunciation } from '../entities/word-pronounciation';
import { WordSynonym } from '../entities/word-synonym';
import { VocabularyWordStatus } from '../entities/vocabulary-word-status';
import { PaginatedResult } from '../../../../shared/application/pagination/paginated-result';

export const VOCABULARY_REPOSITORY = Symbol('VOCABULARY_REPOSITORY');

export interface CreateVocabularyWordParams {
  term: string;
  normalizedTerm: string;
  targetLanguage: LanguageCode;
  difficulty: WordDifficulty;
  partOfSpeech: PartOfSpeech;
  definitions: Array<{
    explanationLanguage: LanguageCode;
    text: string;
    register?: string | null;
  }>;
  examples: Array<{
    sentence: string;
    translation?: string | null;
    translationLanguage?: LanguageCode | null;
  }>;
  pronunciations: Array<{
    phonetic?: string | null;
    audioUrl?: string | null;
    provider?: string | null;
  }>;
  synonyms: Array<{
    value: string;
  }>;
  themeSlugs: string[];
}

export interface FindVocabularyWordParams {
  normalizedTerm?: string;
  difficulty?: WordDifficulty;
  targetLanguage?: LanguageCode;
  theme?: string;
}

export interface VocabularyWordAggregate {
  word: VocabularyWord;
  definitions: WordDefinition[];
  examples: WordExample[];
  pronunciations: WordPronunciation[];
  synonyms: WordSynonym[];
  themes?: string[];
}

export interface ListVocabularyWordsParams {
  page: number;
  pageSize: number;
  targetLanguage?: LanguageCode;
  difficulty?: WordDifficulty;
  partOfSpeech?: PartOfSpeech;
  status?: VocabularyWordStatus;
  search?: string;
}

export interface VocabularyWordListItemProjection {
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

export interface VocabularyRepository {
  listWords(
    params: ListVocabularyWordsParams,
  ): Promise<PaginatedResult<VocabularyWordListItemProjection>>;

  findWordById(wordId: string): Promise<VocabularyWordAggregate | null>;

  search(params: FindVocabularyWordParams): Promise<VocabularyWordAggregate[]>;

  findLeastCoveredThemes(params: {
    targetLanguage: LanguageCode;
    limit: number;
  }): Promise<string[]>;

  /**
   * Both fields required, and named for what they are: method
   * parameters are bivariant, so an all-optional param type let
   * `implements` accept a lookup reading a field nobody passed.
   */
  findByNormalizedTerm(params: {
    normalizedTerm: string;
    targetLanguage: LanguageCode;
  }): Promise<VocabularyWord | null>;

  /**
   * A random sample of terms already held for a language. Random rather
   * than newest: generation feeds it back to the model as "already
   * covered", and the newest slice would only show last night's corner.
   */
  sampleNormalizedTerms(params: {
    targetLanguage: LanguageCode;
    limit: number;
  }): Promise<string[]>;

  /** How many words the corpus holds for a language. */
  countWords(params: { targetLanguage: LanguageCode }): Promise<number>;

  /**
   * The theme slugs the corpus covers least, thinnest first, so
   * generation fills its own gaps. A theme nobody generates for is a
   * promise onboarding made and the daily word cannot keep.
   */
  findLeastCoveredThemes(params: {
    targetLanguage: LanguageCode;
    limit: number;
  }): Promise<string[]>;

  createWord(params: {
    term: string;
    normalizedTerm: string;
    targetLanguage: LanguageCode;
    difficulty: WordDifficulty;
    partOfSpeech: PartOfSpeech;
    definitions: {
      explanationLanguage: LanguageCode;
      text: string;
      register: string | null;
    }[];
    examples: {
      sentence: string;
      translation: string | null;
      translationLanguage: string | null;
    }[];
    pronunciations: {
      phonetic: string | null;
      audioUrl: string | null;
      provider: string | null;
    }[];
    synonyms: { value: string }[];
    themeSlugs: string[];
  }): Promise<VocabularyWordAggregate>;
}
