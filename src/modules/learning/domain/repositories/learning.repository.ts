import { VocabularyWord } from '../../../vocabulary/domain/entities/vocabulary-word';
import { UserLearningProfile } from '../../../user-learning/domain/entities/user-learning-profile';
import { VocabularyWordAggregate } from '../../../vocabulary/domain/repositories/vocabulary.repository';
import {
  UserWordProgress,
  UserWordProgressMasteryLevel,
  UserWordProgressStatus,
} from '../entities/user-word-progress';
import {
  LanguageCode,
  WordDifficulty,
} from '../../../../../generated/prisma/enums';
import { UserLearningStreak } from '../entities/user-learning-streak';
import { FavoriteWord } from '../entities/favorite-word';
import { WordDefinition } from '../../../vocabulary/domain/entities/word-definition';
import { WordExample } from '../../../vocabulary/domain/entities/word-example';
import { WordPronunciation } from '../../../vocabulary/domain/entities/word-pronounciation';
import { WordSynonym } from '../../../vocabulary/domain/entities/word-synonym';
import { PartOfSpeech } from '../../../vocabulary/domain/entities/part-of-speech';

export const LEARNING_REPOSITORY = Symbol('LEARNING_REPOSITORY');

export type UserLearningStats = {
  seen: number;
  learning: number;
  mastered: number;
  skipped: number;
  total: number;
};

export interface CreateDailyAssignmentParams {
  userId: string;
  userLearningProfileId: string;
  wordId: string;
  assignedFor: Date;
}

export interface FindTodayAssignmentParams {
  userId: string;
  assignedFor: Date;
}

export type TodayWordAssignment = VocabularyWordAggregate & {
  assignmentId: string;
  assignedFor: Date;
};

export type RandomWord = VocabularyWordAggregate;

export type ReviewQueueItem = {
  progressId: string;
  wordId: string;
  term: string;
  masteryLevel: number;
  reviewCount: number;
  status: UserWordProgressStatus;
  nextReviewAt: Date | null;
  // The card front needs the part of speech and, for text-to-speech, the
  // language the word is in; the back needs meaning, example and synonyms.
  // A review session preloads its whole deck, so the card never waits on
  // a fetch mid-flip.
  partOfSpeech: PartOfSpeech;
  targetLanguage: LanguageCode;
  definitions: WordDefinition[];
  examples: WordExample[];
  pronunciations: WordPronunciation[];
  synonyms: WordSynonym[];
};

export interface FindUserWordProgressParams {
  userId: string;
  wordId: string;
}

export interface SetUserWordProgressStatusParams {
  userId: string;
  wordId: string;
  status: UserWordProgressStatus;
  masteryLevel: UserWordProgressMasteryLevel;
  seenAt?: Date | null;
  nextReviewAt?: Date | null;
}

export interface FindRandomWordParams {
  targetLanguage?: LanguageCode;
  difficulty?: WordDifficulty;
  themes?: string[];
}

export interface FindReviewQueueParams {
  userId: string;
  now: Date;
  limit: number;
}

export interface UpdateUserWordReviewParams {
  userId: string;
  wordId: string;
  status: UserWordProgressStatus;
  masteryLevel: number;
  reviewCount: number;
  lastReviewedAt: Date;
  nextReviewAt: Date | null;
}

export interface UpsertUserLearningStreakParams {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  /** `yyyy-MM-dd`. */
  lastActivityLocalDate: string;
}

export interface RecordWordReviewEventParams {
  userId: string;
  wordId: string;
  correct: boolean;
  /** The client's own calendar day, `yyyy-MM-dd`. */
  localDate: string;
}

export interface FindUserDailyActivityParams {
  userId: string;
  /** Inclusive `yyyy-MM-dd`. Compared as text — ISO dates sort by date. */
  from: string;
  /** Inclusive `yyyy-MM-dd`. */
  to: string;
}

/** Review counts for one local calendar day. */
export type UserDailyActivity = {
  /** Local calendar day, `yyyy-MM-dd`, exactly as it was recorded. */
  date: string;
  reviewCount: number;
  correctCount: number;
};

export interface FindUserActivityDetailParams {
  userId: string;
  /** Inclusive `yyyy-MM-dd` bounds of the range the caller tapped. */
  from: string;
  to: string;
  /** Caps the word list; the busiest words come first. */
  limit: number;
}

/** A word the user reviewed inside the requested range. */
export type ActivityDetailWord = {
  wordId: string;
  term: string;
  /** Current mastery, not mastery at review time. */
  masteryLevel: number;
  /** Times reviewed within the range, not lifetime. */
  reviewCount: number;
};

/**
 * What happened across a range — the payload behind tapping a heatmap day
 * or a chart bar.
 *
 * Kept apart from [UserDailyActivity] on purpose: the activity series spans
 * a year, and attaching word lists to every day of it would bloat a
 * response whose whole job is to be small.
 */
export type UserActivityDetail = {
  reviewCount: number;
  correctCount: number;
  /**
   * Distinct words reviewed in the range — a count of [words] before the
   * limit trims it.
   *
   * This replaces a "new words" figure, which would have to come from
   * `UserWordProgress.seenAt`: an instant, and therefore exactly the
   * timezone arithmetic this design removes.
   */
  distinctWordCount: number;
  /** Distinct words reviewed, busiest first, capped by the request. */
  words: ActivityDetailWord[];
  /** True when [words] omits some of what was reviewed. */
  hasMoreWords: boolean;
};

export type FindUserWordLibraryParams = {
  userId: string;
  status?: UserWordProgressStatus;
  search?: string;
  limit: number;
  cursor?: string;
};

export type UserWordLibraryDefinition = {
  id: string;
  text: string;
  explanationLanguage: LanguageCode;
};

export type UserWordLibraryItem = {
  progressId: string;
  wordId: string;
  term: string;
  normalizedTerm: string;
  targetLanguage: LanguageCode;
  status: UserWordProgressStatus;
  masteryLevel: number;
  reviewCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  updatedAt: Date;
  pronunciations: WordPronunciation[];
  // A trimmed set of definitions (meaning text + its explanation
  // language) — enough for the list's short meaning preview and to
  // let the client pick the right language. The full word (examples,
  // synonyms) loads on the detail screen.
  definitions: UserWordLibraryDefinition[];
  // The row shows the IPA next to the term.
};

// Whole-library aggregates (never affected by the active filter or
// search): the header line and the filter chips' counts.
export type UserWordLibrarySummary = {
  total: number;
  averageMastery: number;
  statusCounts: Record<UserWordProgressStatus, number>;
};

export type UserWordLibraryResult = {
  items: UserWordLibraryItem[];
  nextCursor: string | null;
  summary: UserWordLibrarySummary;
};

export interface LearningRepository {
  findTodayAssignment(
    params: FindTodayAssignmentParams,
  ): Promise<TodayWordAssignment | null>;

  createDailyAssignment(
    params: CreateDailyAssignmentParams,
  ): Promise<TodayWordAssignment>;

  findCandidateWord(
    profile: UserLearningProfile,
  ): Promise<VocabularyWord | null>;

  findUserWordProgress(
    params: FindUserWordProgressParams,
  ): Promise<UserWordProgress | null>;

  setUserWordProgressStatus(
    params: SetUserWordProgressStatusParams,
  ): Promise<UserWordProgress>;

  findRandomWord(params: FindRandomWordParams): Promise<RandomWord | null>;

  findReviewQueue(params: FindReviewQueueParams): Promise<ReviewQueueItem[]>;

  updateUserWordReview(
    params: UpdateUserWordReviewParams,
  ): Promise<UserWordProgress>;

  /**
   * Appends one review to the activity log. Never updates: the log is what
   * makes per-day history recoverable, unlike `lastReviewedAt`.
   */
  recordWordReviewEvent(params: RecordWordReviewEventParams): Promise<void>;

  /**
   * Review counts per local day across the range, sparse: days with no
   * reviews are absent. The client already generates the day list it wants
   * to render, so it fills the gaps.
   */
  findUserDailyActivity(
    params: FindUserDailyActivityParams,
  ): Promise<UserDailyActivity[]>;

  /** Counts plus the words reviewed across the range. */
  findUserActivityDetail(
    params: FindUserActivityDetailParams,
  ): Promise<UserActivityDetail>;

  findUserLearningStreak(userId: string): Promise<UserLearningStreak | null>;

  upsertUserLearningStreak(
    params: UpsertUserLearningStreakParams,
  ): Promise<UserLearningStreak>;

  findUserLearningStats(userId: string): Promise<UserLearningStats>;

  findUserWordLibrary(
    params: FindUserWordLibraryParams,
  ): Promise<UserWordLibraryResult>;

  findUserFavoriteWords(userId: string): Promise<FavoriteWord[]>;

  addUserFavoriteWord(userId: string, wordId: string): Promise<FavoriteWord>;

  removeUserFavoriteWord(userId: string, wordId: string): Promise<boolean>;
}
