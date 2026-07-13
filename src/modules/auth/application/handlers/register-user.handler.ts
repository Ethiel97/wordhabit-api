import {
  RegisterUserCommand,
  RegisterUserResult,
} from '../commands/register-user.command';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject } from '@nestjs/common';
import {
  AUTH_USER_REPOSITORY,
  type AuthUserRepository,
} from '../../domain/repositories/auth-user.repository';
import {
  PASSWORD_SERVICE,
  type PasswordService,
} from '../../domain/services/password-service';
import {
  TOKEN_SERVICE,
  type TokenService,
} from '../../domain/services/token-service';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<
  RegisterUserCommand,
  RegisterUserResult
> {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,

    @Inject(PASSWORD_SERVICE)
    private readonly passwordHasher: PasswordService,

    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    const existingUser = await this.authUserRepository.findByEmail(
      command.email,
    );
    if (existingUser) {
      throw new ConflictException('Email is already in use.');
    }

    const hashedPassword = await this.passwordHasher.hash(command.password);

    const newUser = await this.authUserRepository.create({
      email: command.email,
      username: command.username.trim(),
      password: hashedPassword,
    });

    const accessToken = await this.tokenService.signAccessToken({
      sub: newUser.id,
      email: newUser.email,
    });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
      },
      accessToken,
    };
  }
}
