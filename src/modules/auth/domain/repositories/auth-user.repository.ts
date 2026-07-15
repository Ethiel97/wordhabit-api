import { User } from '../../../user-learning/domain/entities/user';

export const AUTH_USER_REPOSITORY = Symbol('AUTH_USER_REPOSITORY');

export interface CreateAuthUserParams {
  email: string;
  name: string;
  password: string;
}

export interface AuthUserRepository {
  findByEmail(email: string): Promise<User | null>;

  findById(userId: string): Promise<User | null>;

  create(params: CreateAuthUserParams): Promise<User>;

  markEmailVerified(userId: string): Promise<User>;
}
