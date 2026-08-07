import { AuthProvider } from './auth-provider';

/**
 * What a provider tells us about the person who just signed in.
 *
 * The result of verifying a token, never of trusting the client: every
 * field here has been checked against the provider's own signing keys.
 */
export interface SocialIdentity {
  provider: AuthProvider;

  /**
   * The provider's subject id. This — not the email — is the identity:
   * it survives the user changing their address, and two providers may
   * report the same address for different people.
   */
  providerUserId: string;

  /**
   * Absent when the user hid it. Apple's Sign in with Apple can return a
   * private relay address, and a returning Apple user may carry no email
   * at all, which is why the id above is what we key on.
   */
  email: string | null;

  /**
   * Whether the provider vouches for the address. Linking to an existing
   * account happens only when this is true — otherwise anyone able to
   * create an account with someone else's address could claim theirs.
   */
  emailVerified: boolean;

  /** Apple returns this on the first authorisation only, never again. */
  name: string | null;
}
