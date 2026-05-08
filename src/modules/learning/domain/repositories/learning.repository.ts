import { VocabularyWord } from '../../../vocabulary/domain/entities/vocabulary-word';
import { UserLearningProfile } from '../../../user-learning/domain/entities/user-learning-profile';
import { VocabularyWordAggregate } from '../../../vocabulary/domain/repositories/vocabulary.repository';

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
}
