import { VocabularyWord } from '../../../vocabulary/domain/entities/vocabulary-word';
import { UserLearningProfile } from '../../../user-learning/domain/entities/user-learning-profile';
import { VocabularyWordAggregate } from '../../../vocabulary/domain/repositories/vocabulary.repository';
import {
  UserWordProgress,
  UserWordProgressMasteryLevel,
  UserWordProgressStatus,
} from '../entities/user-word-progress';
import { LanguageCode } from '../../../../../generated/prisma/enums';
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
  lastActivityDate: Date;
}

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
  // A trimmed set of definitions (meaning text + its explanation
  // language) — enough for the list's short meaning preview and to
  // let the client pick the right language. The full word (examples,
  // synonyms, pronunciations) loads on the detail screen.
  definitions: UserWordLibraryDefinition[];
};

export type UserWordLibraryResult = {
  items: UserWordLibraryItem[];
  nextCursor: string | null;
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
