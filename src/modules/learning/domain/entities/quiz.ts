/**
 * The application's quiz vocabulary — owned here, mapped from Prisma's
 * enum at the boundary like every other wire type.
 */
export enum QuizMode {
  MASTERY = 'MASTERY',
  REALWORLD = 'REALWORLD',
  SPEED = 'SPEED',
}

/**
 * What a question tests, so the client can style and phrase each kind
 * without parsing the prompt.
 */
export enum QuizQuestionKind {
  MEANING = 'MEANING',
  GAP_FILL = 'GAP_FILL',
  SYNONYM = 'SYNONYM',
  ANTONYM = 'ANTONYM',
  WORD_TYPE = 'WORD_TYPE',
  USAGE = 'USAGE',
}

export interface QuizQuestion {
  kind: QuizQuestionKind;
  /** The everyday moment, present on USAGE questions only. */
  situation?: string;
  prompt: string;
  options: string[];
  /**
   * Index into [options]. Shipped to the client on purpose: the quiz
   * grades on-device for instant feedback, the same trust model as
   * flashcards — the server pays XP on what the client reports either
   * way.
   */
  correctIndex: number;
}

export interface WordQuiz {
  wordId: string;
  term: string;
  mode: QuizMode;
  questions: QuizQuestion[];
}
