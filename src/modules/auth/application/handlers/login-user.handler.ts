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
import {
  TOKEN_SERVICE,
  type TokenService,
} from '../../domain/services/token-service';

@CommandHandler(LoginUserCommand)
export class LoginUserHandler implements ICommandHandler<
  LoginUserCommand,
  LoginUserResult
> {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,

    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,

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

    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerifiedAt !== null,
      },
      accessToken,
    };
  }
}
