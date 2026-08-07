import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { AuthProvider } from '../../domain/entities/auth-provider';
import { SocialIdentity } from '../../domain/entities/social-identity';
import { SocialIdentityVerifier } from '../../domain/services/social-identity-verifier';

interface ProviderConfig {
  issuer: string | string[];
  jwksUri: string;
  /** Env var holding the client id the token must be addressed to. */
  audienceKey: string;
}

const PROVIDERS: Record<AuthProvider, ProviderConfig> = {
  [AuthProvider.APPLE]: {
    issuer: 'https://appleid.apple.com',
    jwksUri: 'https://appleid.apple.com/auth/keys',
    audienceKey: 'APPLE_CLIENT_IDS',
  },
  [AuthProvider.GOOGLE]: {
    // Google signs with either form and treats them as equivalent.
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
    audienceKey: 'GOOGLE_CLIENT_IDS',
  },
};

/**
 * Verifies provider identity tokens against their published keys.
 *
 * Both Apple and Google issue standard signed JWTs, so one implementation
 * covers them: only the issuer, the key set and the accepted audience
 * differ. `jose` fetches and caches the key sets, and rotates them when a
 * token arrives signed by a key it has not seen.
 */
@Injectable()
export class JwksSocialIdentityVerifier implements SocialIdentityVerifier {
  private readonly logger = new Logger(JwksSocialIdentityVerifier.name);

  private readonly keySets = new Map<
    AuthProvider,
    ReturnType<typeof createRemoteJWKSet>
  >();

  constructor(private readonly configService: ConfigService) {}

  async verify(
    provider: AuthProvider,
    idToken: string,
  ): Promise<SocialIdentity> {
    const config = PROVIDERS[provider];
    const audience = this.audienceFor(config.audienceKey);

    let payload: JWTPayload;
    try {
      // Audience is the check that matters most: without it a token
      // minted for any other app using the same provider would pass.
      ({ payload } = await jwtVerify(idToken, this.keySetFor(provider), {
        issuer: config.issuer,
        audience,
      }));
    } catch (error) {
      this.logger.warn('Rejected a social identity token', {
        provider,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new UnauthorizedException('Invalid identity token');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Identity token carries no subject');
    }

    return {
      provider,
      providerUserId: payload.sub,
      email: this.readEmail(payload),
      emailVerified: this.readEmailVerified(payload),
      name: this.readName(payload),
    };
  }

  private keySetFor(provider: AuthProvider) {
    const cached = this.keySets.get(provider);
    if (cached) return cached;

    const keySet = createRemoteJWKSet(new URL(PROVIDERS[provider].jwksUri));
    this.keySets.set(provider, keySet);
    return keySet;
  }

  /**
   * A provider may serve several of our clients — an iOS bundle id and a
   * web client id, say — so the accepted audience is a list.
   */
  private audienceFor(key: string): string[] {
    const raw = this.configService.getOrThrow<string>(key);
    const audiences = raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (audiences.length === 0) {
      throw new Error(`${key} is set but empty`);
    }

    return audiences;
  }

  private readEmail(payload: JWTPayload): string | null {
    const email = payload.email;
    return typeof email === 'string' ? email.trim().toLowerCase() : null;
  }

  /**
   * Apple sends the flag as the string `"true"`, Google as a boolean.
   * Anything else counts as unverified: this is the claim that decides
   * whether we may attach a provider to an existing account.
   */
  private readEmailVerified(payload: JWTPayload): boolean {
    const verified = payload.email_verified;
    return verified === true || verified === 'true';
  }

  /**
   * Google puts the display name in the token. Apple never does — it
   * hands the name to the client once, at the first authorisation, which
   * is why the client forwards it separately.
   */
  private readName(payload: JWTPayload): string | null {
    const name = payload.name;
    return typeof name === 'string' && name.trim() ? name.trim() : null;
  }
}
