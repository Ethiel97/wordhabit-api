import { CommandBus } from '@nestjs/cqrs';
import { RegisterUserRequestDto } from '../../application/dto/register-user-request.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RegisterUserCommand } from '../../application/commands/register-user.command';
import { AUTH } from '../endpoints/auth.endpoints';
import { LoginUserRequestDto } from '../../application/dto/login-user-request.dto';
import { LoginUserCommand } from '../../application/commands/login-user.command';
import { AuthenticateWithProviderCommand } from '../../application/commands/authenticate-with-provider.command';
import { AuthenticateWithProviderRequestDto } from '../../application/dto/authenticate-with-provider-request.dto';
import { VerifyEmailRequestDto } from '../../application/dto/verify-email-request.dto';
import { VerifyEmailCommand } from '../../application/commands/verify-email.command';
import { ResendVerificationEmailCommand } from '../../application/commands/resend-verification-email.command';
import { JwtAuthGuard } from '../../infrastructure/authentication/jwt-auth.guard';
import { CurrentUser } from '../current-user.decoraor';
import { type AuthenticatedUser } from '../../domain/entities/authenticated-user';
import { Public } from '../public.decorator';
import { DeleteAccountRequestDto } from '../../application/dto/delete-account-request.dto';
import { DeleteAccountCommand } from '../../application/commands/delete-account.command';
import { UpdateMeRequestDto } from '../../application/dto/update-me-request.dto';
import { UpdateMeCommand } from '../../application/commands/update-me.command';
import { UpdatePasswordCommand } from '../../application/commands/update-password.command';
import { UpdatePasswordRequestDto } from '../../application/dto/update-password.request.dto';
import { RefreshSessionRequestDto } from '../../application/dto/refresh-session-request.dto';
import { RefreshSessionCommand } from '../../application/commands/refresh-session.command';
import { LogoutCommand } from '../../application/commands/logout.command';
import { RequestEmailChangeDto } from '../../application/dto/request-email-change.dto';
import { ConfirmEmailChangeDto } from '../../application/dto/confirm-email-change.dto';
import { RequestEmailChangeCommand } from '../../application/commands/request-email-change.command';
import { ConfirmEmailChangeCommand } from '../../application/commands/confirm-email-change.command';

@Controller(AUTH.BASE)
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(AUTH.DELETE_ACCOUNT)
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: DeleteAccountRequestDto,
  ) {
    return this.commandBus.execute(
      new DeleteAccountCommand(user.id, body.reason),
    );
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Get(AUTH.ME)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Patch(AUTH.UPDATE_ME)
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateMeRequestDto,
  ) {
    return this.commandBus.execute(new UpdateMeCommand(user.id, body.name));
  }

  @Patch(AUTH.UPDATE_PASSWORD)
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  updatePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdatePasswordRequestDto,
  ) {
    return this.commandBus.execute(
      new UpdatePasswordCommand(user.id, body.oldPassword, body.newPassword),
    );
  }

  @Post(AUTH.REGISTER)
  @Public()
  @HttpCode(201)
  async register(@Body() body: RegisterUserRequestDto) {
    return this.commandBus.execute(
      new RegisterUserCommand(body.email, body.name, body.password),
    );
  }

  @Post(AUTH.LOGIN)
  @Public()
  @HttpCode(200)
  async login(@Body() body: LoginUserRequestDto) {
    return this.commandBus.execute(
      new LoginUserCommand(body.email, body.password),
    );
  }

  // One endpoint for both providers, and one for signing up as well as
  // signing in: from the provider's answer we cannot tell them apart,
  // and the client should not have to either.
  @Post(AUTH.SOCIAL)
  @Public()
  @HttpCode(200)
  async authenticateWithProvider(
    @Body() body: AuthenticateWithProviderRequestDto,
  ) {
    return this.commandBus.execute(
      new AuthenticateWithProviderCommand(
        body.provider,
        body.idToken,
        body.name,
      ),
    );
  }

  // Public: the caller's access token is expected to be expired — that
  // is the whole reason it is here. The refresh token is the credential.
  @UseGuards(JwtAuthGuard)
  @Post(AUTH.REQUEST_EMAIL_CHANGE)
  @HttpCode(202)
  async requestEmailChange(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RequestEmailChangeDto,
  ) {
    return this.commandBus.execute(
      new RequestEmailChangeCommand(
        user.id,
        body.newEmail,
        body.currentPassword,
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(AUTH.CONFIRM_EMAIL_CHANGE)
  @HttpCode(200)
  async confirmEmailChange(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ConfirmEmailChangeDto,
  ) {
    return this.commandBus.execute(
      new ConfirmEmailChangeCommand(user.id, body.code),
    );
  }

  @Post(AUTH.REFRESH_TOKEN)
  @Public()
  @HttpCode(200)
  async refreshToken(@Body() body: RefreshSessionRequestDto) {
    return this.commandBus.execute(
      new RefreshSessionCommand(body.refreshToken),
    );
  }

  @Post(AUTH.LOGOUT)
  @Public()
  @HttpCode(204)
  async logout(@Body() body: RefreshSessionRequestDto) {
    await this.commandBus.execute(new LogoutCommand(body.refreshToken));
  }

  @UseGuards(JwtAuthGuard)
  @Post(AUTH.VERIFY_EMAIL)
  @HttpCode(200)
  async verifyEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: VerifyEmailRequestDto,
  ) {
    return this.commandBus.execute(new VerifyEmailCommand(user.id, body.code));
  }

  @UseGuards(JwtAuthGuard)
  @Post(AUTH.RESEND_VERIFICATION_EMAIL)
  @HttpCode(200)
  async resendVerificationEmail(@CurrentUser() user: AuthenticatedUser) {
    return this.commandBus.execute(new ResendVerificationEmailCommand(user.id));
  }
}
