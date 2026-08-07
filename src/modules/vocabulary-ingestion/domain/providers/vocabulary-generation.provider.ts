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

export interface GeneratedVocabularyAntonym {
  value: string;
}

/**
 * One Real-World Situations question.
 *
 * The only quiz material a query cannot build: its wrong answers are
 * plausible *misuses of the term itself*, not other words' definitions.
 * Written here, once, rather than paid for on every Pro session.
 */
export interface GeneratedQuizScenario {
  /** The language the situation and options are written in. */
  language: LanguageCode;
  /** The everyday moment the question is set in. */
  situation: string;
  question: string;
  correct: string;
  distractors: string[];
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
  antonyms: GeneratedVocabularyAntonym[];
  quizScenarios: GeneratedQuizScenario[];
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

/**
 * An existing corpus entry, handed to the model as context.
 *
 * Definitions and examples ride along on purpose: scenarios written
 * against the word's *actual* senses stay consistent with what the
 * learner was taught, where a bare term invites the model to pick a
 * meaning of its own.
 */
export interface QuizMaterialWordContext {
  wordId: string;
  term: string;
  targetLanguage: LanguageCode;
  partOfSpeech: PartOfSpeech;
  difficulty: WordDifficulty;
  definitions: { explanationLanguage: LanguageCode; text: string }[];
  examples: { sentence: string }[];
}

export interface GeneratedQuizMaterialItem {
  /** Echo of the term, so results survive reordering. */
  term: string;
  antonyms: GeneratedVocabularyAntonym[];
  quizScenarios: GeneratedQuizScenario[];
}

export interface GenerateQuizMaterialInput {
  words: QuizMaterialWordContext[];
}

export interface GeneratedQuizMaterialBatch {
  items: GeneratedQuizMaterialItem[];
}

/**
 * Words enriched per provider call.
 *
 * Smaller than MAX_VOCABULARY_BATCH_SIZE: each entry carries its
 * definitions and examples *into* the prompt, so ten words of context
 * cost what thirty bare terms would.
 */
export const MAX_QUIZ_MATERIAL_BATCH_SIZE = 10;

export interface VocabularyGenerationProvider {
  generateVocabularyBatch(
    input: GenerateVocabularyBatchInput,
  ): Promise<GeneratedVocabularyBatch>;

  /**
   * Writes quiz material for words the corpus already holds — the
   * backfill path. New words get theirs at ingestion.
   */
  generateQuizMaterial(
    input: GenerateQuizMaterialInput,
  ): Promise<GeneratedQuizMaterialBatch>;
}
