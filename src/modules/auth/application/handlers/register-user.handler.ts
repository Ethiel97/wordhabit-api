import {
  RegisterUserCommand,
  RegisterUserResult,
} from '../commands/register-user.command';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  AUTH_USER_REPOSITORY,
  type AuthUserRepository,
} from '../../domain/repositories/auth-user.repository';
import {
  PASSWORD_SERVICE,
  type PasswordService,
} from '../../domain/services/password-service';
import { SessionIssuer } from '../services/session-issuer.service';
import { EmailVerificationService } from '../services/email-verification.service';
import { EmailAlreadyTakenError } from '../errors/auth-error';

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

    private readonly sessionIssuer: SessionIssuer,

    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    const existingUser = await this.authUserRepository.findByEmail(
      command.email,
    );
    if (existingUser) {
      throw new EmailAlreadyTakenError({ email: command.email });
    }

    const hashedPassword = await this.passwordHasher.hash(command.password);

    const newUser = await this.authUserRepository.create({
      email: command.email,
      name: command.name.trim(),
      password: hashedPassword,
    });

    await this.emailVerificationService.issueVerificationCode({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
    });

    const session = await this.sessionIssuer.issue(newUser);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        emailVerified: false,
      },
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  }
}
