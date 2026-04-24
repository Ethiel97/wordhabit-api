import { User } from '../entities/user';
import { UserLearningProfile } from '../entities/user-learning-profile';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';

export const USER_LEARNING_REPOSITORY = Symbol('USER_LEARNING_REPOSITORY');

export interface FindUserLearningProfileParams {
  userId: string;
  targetLanguage: LanguageCode;
}

export interface CreateUserParams {
  email: string;
  username: string;
}

export interface CreateUserLearningProfileParams {
  userId: string;
  targetLanguage: LanguageCode;
  interfaceLanguage: LanguageCode;
  themeSlugs: string[];
}

export interface UserLearningRepository {
  createUser(params: CreateUserParams): Promise<User>;

  createUserLearningProfile(
    params: CreateUserLearningProfileParams,
  ): Promise<UserLearningProfile>;

  findUserById(userId: string): Promise<User | null>;

  findUserByEmail(email: string): Promise<User | null>;

  findActiveUserLearningProfile(
    userId: string,
  ): Promise<UserLearningProfile | null>;

  findUserLearningProfile(
    params: FindUserLearningProfileParams,
  ): Promise<UserLearningProfile | null>;
}
