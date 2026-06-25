import { VocabularyWord } from '../../../vocabulary/domain/entities/vocabulary-word';
import { UserLearningProfile } from '../../../user-learning/domain/entities/user-learning-profile';
import { VocabularyWordAggregate } from '../../../vocabulary/domain/repositories/vocabulary.repository';
import {
  UserWordProgress,
  UserWordProgressMasteryLevel,
  UserWordProgressStatus,
} from '../entities/user-word-progress';
import { LanguageCode } from '../../../../../generated/prisma/enums';

export const LEARNING_REPOSITORY = Symbol('LEARNING_REPOSITORY');

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
}
