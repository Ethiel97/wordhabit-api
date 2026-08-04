import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger, UnauthorizedException } from '@nestjs/common';
import {
  RefreshSessionCommand,
  RefreshSessionResult,
} from '../commands/refresh-session.command';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import {
  REFRESH_TOKEN_SERVICE,
  type RefreshTokenService,
} from '../../domain/services/refresh-token-service';
import {
  AUTH_USER_REPOSITORY,
  type AuthUserRepository,
} from '../../domain/repositories/auth-user.repository';
import { SessionIssuer } from '../services/session-issuer.service';

/**
 * Trades a refresh token for a fresh pair and burns the old one.
 * Rotation is what makes a long-lived credential tolerable, and what
 * makes replay detectable.
 */
@CommandHandler(RefreshSessionCommand)
export class RefreshSessionHandler implements ICommandHandler<
  RefreshSessionCommand,
  RefreshSessionResult
> {
  private readonly logger = new Logger(RefreshSessionHandler.name);

  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,

    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokenService: RefreshTokenService,

    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,

    private readonly sessionIssuer: SessionIssuer,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<RefreshSessionResult> {
    const tokenHash = this.refreshTokenService.hash(command.refreshToken);
    const stored = await this.refreshTokenRepository.findByHash(tokenHash);

    // One message for every rejection: unknown, spent and expired must
    // be indistinguishable.
    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      // A spent token came back: replay or a client that kept a copy,
      // indistinguishable from here, so every session ends.
      this.logger.warn(
        `Refresh token reuse detected for user ${stored.userId} — revoking all sessions`,
      );
      await this.refreshTokenRepository.revokeAllForUser(stored.userId);
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.authUserRepository.findById(stored.userId);

    // Rows survive the grace period, so the token outlives the right to
    // use it.
    if (!user || user.deletedAt) {
      await this.refreshTokenRepository.revokeAllForUser(stored.userId);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.sessionIssuer.issue(user);
    await this.refreshTokenRepository.revoke(stored.id, session.refreshTokenId);

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  }
}
