import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user';
import {
  TOKEN_SERVICE,
  type TokenService,
} from '../../domain/services/token-service';
import {
  REFRESH_TOKEN_SERVICE,
  type RefreshTokenService,
} from '../../domain/services/refresh-token-service';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';

export type IssuedSession = {
  accessToken: string;
  refreshToken: string;
};

/**
 * The one place a session is minted.
 *
 * Login, registration and refresh all come through here, so the pair
 * they hand out can never drift apart — and the access token's claims
 * are written once instead of in every handler.
 */
@Injectable()
export class SessionIssuer {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,

    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokenService: RefreshTokenService,

    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async issue(user: User): Promise<IssuedSession & { refreshTokenId: string }> {
    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email,
      // Bumped on every password change, which is what lets a short
      // access token be rejected before it expires.
      passwordVersion: user.passwordVersion,
    });

    const issued = this.refreshTokenService.issue();
    const stored = await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: issued.tokenHash,
      expiresAt: issued.expiresAt,
    });

    return {
      accessToken,
      refreshToken: issued.token,
      refreshTokenId: stored.id,
    };
  }
}
