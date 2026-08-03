import { RefreshToken } from '../entities/refresh-token';

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface CreateRefreshTokenParams {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RefreshTokenRepository {
  create(params: CreateRefreshTokenParams): Promise<RefreshToken>;

  findByHash(tokenHash: string): Promise<RefreshToken | null>;

  /** Marks one token spent, pointing at the token issued in its place. */
  revoke(tokenId: string, replacedByTokenId?: string): Promise<void>;

  /**
   * Ends every live session of a user at once.
   *
   * Used on logout-everywhere, on a password change, and on detecting a
   * replayed token — at that point one of the family is in someone
   * else's hands and there is no telling which.
   */
  revokeAllForUser(userId: string): Promise<void>;
}
