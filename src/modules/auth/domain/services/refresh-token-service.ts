export const REFRESH_TOKEN_SERVICE = Symbol('REFRESH_TOKEN_SERVICE');

export type IssuedRefreshToken = {
  /** The value handed to the client, and the only place it ever exists. */
  token: string;
  /** What the database stores instead. */
  tokenHash: string;
  expiresAt: Date;
};

/**
 * Mints and recognises refresh tokens.
 *
 * Opaque random strings, not JWTs: a refresh token has to be
 * revocable, and a self-validating token cannot be taken back before it
 * expires. Since the server looks this one up anyway, signing it would
 * buy nothing and only widen what a leak exposes.
 */
export interface RefreshTokenService {
  issue(): IssuedRefreshToken;

  /** The digest to search the store by, for a token a client presented. */
  hash(token: string): string;
}
