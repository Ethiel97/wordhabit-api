import { User } from '../entities/user';
import { AccountDeletionReason } from '../entities/account-deletion-reason';
import { AuthProvider } from '../entities/auth-provider';

export const AUTH_USER_REPOSITORY = Symbol('AUTH_USER_REPOSITORY');

export interface CreateAuthUserParams {
  email: string;
  name: string;
  /** Absent for accounts born from a provider: they never have one. */
  password?: string;

  /**
   * Born already proven. Only a provider that vouched for the address
   * may ask for this — a password signup still has to answer a code.
   */
  emailVerified?: boolean;
}

export interface LinkIdentityParams {
  userId: string;
  provider: AuthProvider;
  providerUserId: string;
}

export interface UpdateAuthUserParams {
  name?: string;
}

export interface AuthUserRepository {
  findByEmail(email: string): Promise<User | null>;

  findById(userId: string): Promise<User | null>;

  /**
   * The account a provider's subject id belongs to, if we have seen it.
   *
   * Keyed on the id rather than the email: the id is what survives a
   * user changing their address at the provider.
   */
  findByIdentity(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<User | null>;

  /**
   * Attaches a provider to an account. Idempotent — signing in twice
   * from the same device must not fail on the unique index.
   */
  linkIdentity(params: LinkIdentityParams): Promise<void>;

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
