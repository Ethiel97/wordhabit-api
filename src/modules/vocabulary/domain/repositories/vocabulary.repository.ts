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
  normalizedTerm: string;
  targetLanguage: LanguageCode;
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

  findWordByNormalizedTerm(
    params: FindVocabularyWordParams,
  ): Promise<VocabularyWordAggregate | null>;

  findByNormalizedTerm(
    params: FindVocabularyWordParams,
  ): Promise<VocabularyWord | null>;

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
