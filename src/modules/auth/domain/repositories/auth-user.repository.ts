import { User } from '../../../user-learning/domain/entities/user';
import { AccountDeletionReason } from '../entities/account-deletion-reason';

export const AUTH_USER_REPOSITORY = Symbol('AUTH_USER_REPOSITORY');

export interface CreateAuthUserParams {
  email: string;
  name: string;
  password: string;
}

export interface UpdateAuthUserParams {
  name?: string;
}

export interface AuthUserRepository {
  findByEmail(email: string): Promise<User | null>;

  findById(userId: string): Promise<User | null>;

  create(params: CreateAuthUserParams): Promise<User>;

  update(userId: string, params: UpdateAuthUserParams): Promise<User>;

  /// Stores an already-hashed password; hashing belongs to the handler.
  changePassword(userId: string, passwordHash: string): Promise<User>;

  /**
   * Moves the account to a proven address. Called only after the new one
   * has answered a code, so the verified flag carries over.
   */
  changeEmail(userId: string, email: string): Promise<User>;

  markEmailVerified(userId: string): Promise<User>;

  /** Marks the account deleted and starts its grace period. */
  softDelete(params: {
    userId: string;
    reason?: AccountDeletionReason;
  }): Promise<User>;

  /** Cancels a pending deletion. */
  restore(userId: string): Promise<User>;

  /**
   * Accounts whose grace period has run out, oldest first. Takes a
   * *deletion* cutoff, not a purge date: nothing stores when an account
   * is due, so the caller walks it back from now.
   */
  findPurgeable(deletedBefore: Date, limit?: number): Promise<User[]>;

  /** Erases the account and everything cascading from it. */
  purge(userId: string): Promise<void>;
}
