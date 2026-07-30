import { User } from '../../../user-learning/domain/entities/user';
import { AccountDeletionReason } from '../entities/account-deletion-reason';

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

  /** Marks the account deleted and starts its grace period. */
  softDelete(params: {
    userId: string;
    reason?: AccountDeletionReason;
  }): Promise<User>;

  /** Cancels a pending deletion. */
  restore(userId: string): Promise<User>;

  /**
   * Accounts whose grace period has run out, oldest first, capped at
   * [limit].
   *
   * Takes the *deletion* date to stay behind, not a purge date: nothing
   * stores when an account is due, so the caller walks the cutoff back
   * from now instead — see `purgeCutoff`.
   */
  findPurgeable(deletedBefore: Date, limit?: number): Promise<User[]>;

  /** Erases the account and everything cascading from it. */
  purge(userId: string): Promise<void>;
}
