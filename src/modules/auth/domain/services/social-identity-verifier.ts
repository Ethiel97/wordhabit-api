import { AuthProvider } from '../entities/auth-provider';
import { SocialIdentity } from '../entities/social-identity';

export const SOCIAL_IDENTITY_VERIFIER = Symbol('SOCIAL_IDENTITY_VERIFIER');

export interface SocialIdentityVerifier {
  /**
   * Checks [idToken] against [provider]'s published signing keys and
   * returns what it asserts.
   *
   * Throws when the token is forged, expired, or issued for a different
   * application. The handler above must never see an unverified claim.
   */
  verify(provider: AuthProvider, idToken: string): Promise<SocialIdentity>;
}
