import { User } from '../entities/user';
import { UserLearningProfile } from '../entities/user-learning-profile';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';

export const USER_LEARNING_REPOSITORY = Symbol('USER_LEARNING_REPOSITORY');

export interface FindUserLearningProfileParams {
  userId: string;
  targetLanguage: LanguageCode;
}

export interface FindUserLearningProfilesParams {
  userId: string;
}

export interface ActivateUserLearningProfileParams {
  userId: string;
  profileId: string;
}

export interface SetUserLearningProfileThemesParams {
  profileId: string;
  themeSlugs: string[];
}

export interface CreateUserParams {
  email: string;
  name: string;
}

export interface CreateUserLearningProfileParams {
  userId: string;
  targetLanguage: LanguageCode;
  interfaceLanguage: LanguageCode;
  difficulty?: WordDifficulty;
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

  findUserLearningProfileById(
    profileId: string,
  ): Promise<UserLearningProfile | null>;

  findUserLearningProfile(
    params: FindUserLearningProfileParams,
  ): Promise<UserLearningProfile | null>;

  findUserLearningProfiles(
    params: FindUserLearningProfilesParams,
  ): Promise<UserLearningProfile[]>;

  activateUserLearningProfile(
    params: ActivateUserLearningProfileParams,
  ): Promise<UserLearningProfile>;

  setUserLearningProfileThemes(
    params: SetUserLearningProfileThemesParams,
  ): Promise<UserLearningProfile>;
}
