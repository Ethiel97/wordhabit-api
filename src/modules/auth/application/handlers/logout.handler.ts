import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { LogoutCommand } from '../commands/logout.command';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import {
  REFRESH_TOKEN_SERVICE,
  type RefreshTokenService,
} from '../../domain/services/refresh-token-service';

/**
 * Ends one session.
 *
 * Never fails: a client that is signing out has already discarded its
 * tokens, and answering "that token was unknown" would only tell a
 * caller which tokens exist.
 */
@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand, void> {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,

    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const stored = await this.refreshTokenRepository.findByHash(
      this.refreshTokenService.hash(command.refreshToken),
    );

    if (stored && !stored.revokedAt) {
      await this.refreshTokenRepository.revoke(stored.id);
    }
  }
}
