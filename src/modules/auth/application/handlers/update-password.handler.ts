import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  UpdatePasswordCommand,
  UpdatePasswordResult,
} from '../commands/update-password.command';
import {
  AUTH_USER_REPOSITORY,
  type AuthUserRepository,
} from '../../domain/repositories/auth-user.repository';
import { Inject, NotFoundException } from '@nestjs/common';
import {
  PASSWORD_SERVICE,
  type PasswordService,
} from '../../domain/services/password-service';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { SessionIssuer } from '../services/session-issuer.service';
import {
  PasswordMismatchError,
  PasswordNotSetError,
  PasswordUnchangedError,
} from '../errors/password-errors';

@CommandHandler(UpdatePasswordCommand)
export class UpdatePasswordHandler implements ICommandHandler<
  UpdatePasswordCommand,
  UpdatePasswordResult
> {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,

    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: PasswordService,

    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,

    private readonly sessionIssuer: SessionIssuer,
  ) {}

  async execute(command: UpdatePasswordCommand): Promise<UpdatePasswordResult> {
    const user = await this.authUserRepository.findById(command.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Accounts created through a social provider have no password to
    // verify — a `!` here would surface as a 500 instead of a clear 400.
    if (!user.password) {
      throw new PasswordNotSetError({ userId: command.userId });
    }

    const passwordMatches = await this.passwordService.verify(
      command.oldPassword,
      user.password,
    );

    if (!passwordMatches) {
      throw new PasswordMismatchError({ userId: command.userId });
    }

    const newPasswordMatchesOld = await this.passwordService.verify(
      command.newPassword,
      user.password,
    );

    // Rejected rather than silently accepted: it would bump the password
    // version and sign every other device out for no change at all.
    if (newPasswordMatchesOld) {
      throw new PasswordUnchangedError({ userId: command.userId });
    }

    const updatedUser = await this.authUserRepository.changePassword(
      command.userId,
      await this.passwordService.hash(command.newPassword),
    );

    // Every other device loses its session. The bumped password version
    // already rejects their access tokens; without this they would just
    // refresh their way back in, which is the hole rotation opens.
    await this.refreshTokenRepository.revokeAllForUser(updatedUser.id);

    const session = await this.sessionIssuer.issue(updatedUser);

    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        emailVerified: !!updatedUser.emailVerifiedAt,
      },
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  }
}
