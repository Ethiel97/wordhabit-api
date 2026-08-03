import { EmailChangeRequest } from '../entities/email-change-request';

export const EMAIL_CHANGE_REQUEST_REPOSITORY = Symbol(
  'EMAIL_CHANGE_REQUEST_REPOSITORY',
);

export interface CreateEmailChangeRequestParams {
  userId: string;
  newEmail: string;
  codeHash: string;
  expiresAt: Date;
}

export interface EmailChangeRequestRepository {
  create(params: CreateEmailChangeRequestParams): Promise<EmailChangeRequest>;

  /** The one still open, if any — expired rows are left for the record. */
  findLatestActiveByUserId(userId: string): Promise<EmailChangeRequest | null>;

  incrementAttempts(requestId: string): Promise<void>;

  consume(requestId: string): Promise<void>;

  /**
   * Closes every open request of a user.
   *
   * Called before issuing a new one, so a code sent to an address the
   * user has since thought better of cannot still be redeemed.
   */
  invalidateAllForUser(userId: string): Promise<void>;
}
