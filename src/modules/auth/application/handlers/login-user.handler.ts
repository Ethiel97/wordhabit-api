import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  LoginUserCommand,
  LoginUserResult,
} from '../commands/login-user.command';
import {
  AUTH_USER_REPOSITORY,
  type AuthUserRepository,
} from '../../domain/repositories/auth-user.repository';
import { Inject, UnauthorizedException } from '@nestjs/common';
import {
  PASSWORD_SERVICE,
  type PasswordService,
} from '../../domain/services/password-service';
import { SessionIssuer } from '../services/session-issuer.service';

@CommandHandler(LoginUserCommand)
export class LoginUserHandler implements ICommandHandler<
  LoginUserCommand,
  LoginUserResult
> {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,

    private readonly sessionIssuer: SessionIssuer,

    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: PasswordService,
  ) {}

  async execute(command: LoginUserCommand): Promise<LoginUserResult> {
    const { email } = command;
    const user = await this.authUserRepository.findByEmail(
      email.trim().toLowerCase(),
    );

    if (!user?.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.passwordService.verify(
      command.password,
      //the actual password hash
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const activeUser = user.deletedAt
      ? await this.authUserRepository.restore(user.id)
      : user;

    const session = await this.sessionIssuer.issue(activeUser);

    return {
      user: {
        id: activeUser.id,
        email: activeUser.email,
        name: activeUser.name,
        emailVerified: activeUser.emailVerifiedAt !== null,
      },
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  }
}
