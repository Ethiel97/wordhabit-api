import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';
import { QuizMode } from '../entities/quiz';
import {
  QuizDistractorWord,
  QuizScenarioSource,
  QuizTargetWord,
} from '../services/quiz-question-builder';

export interface QuizWordMaterial {
  target: QuizTargetWord;
  /** What the distractor pool is matched on. */
  targetLanguage: LanguageCode;
  difficulty: WordDifficulty;
  scenarios: QuizScenarioSource[];
}

export interface FindQuizDistractorPoolParams {
  wordId: string;
  targetLanguage: LanguageCode;
  difficulty: WordDifficulty;
  limit: number;
}

export interface CreateQuizResultParams {
  userId: string;
  wordId: string;
  mode: QuizMode;
  correctCount: number;
  questionCount: number;
  localDate: string;
}

export const QUIZ_REPOSITORY = Symbol('QUIZ_REPOSITORY');

/**
 * Everything the quiz reads and writes, split out of
 * [LearningRepository]: same module, separate contract, so the review
 * scheduler's repository does not grow a second feature's surface.
 */
export interface QuizRepository {
  /** The word under test plus its stored scenarios, or null if unknown. */
  findQuizWordMaterial(wordId: string): Promise<QuizWordMaterial | null>;

  /**
   * Words the wrong answers are drawn from: same language and
   * difficulty, never the target itself, sampled at random so two
   * rounds on the same word do not repeat their distractors.
   */
  findQuizDistractorPool(
    params: FindQuizDistractorPoolParams,
  ): Promise<QuizDistractorWord[]>;

  /** Appends one finished round to the durable quiz log. */
  createQuizResult(params: CreateQuizResultParams): Promise<void>;

  /** Correct quiz answers, lifetime or windowed — XP's second source. */
  countCorrectQuizAnswers(params: {
    userId: string;
    from?: string;
    to?: string;
  }): Promise<number>;

  /**
   * Distinct modes in which the learner has at least one perfect round.
   * QUIZ_CHAMPION is won at all three.
   */
  countPerfectQuizModes(params: { userId: string }): Promise<number>;
}
