import { CommandBus } from '@nestjs/cqrs';
import { RegisterUserRequestDto } from '../../application/dto/register-user-request.dto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RegisterUserCommand } from '../../application/commands/register-user.command';
import { AUTH } from '../endpoints/auth.endpoints';
import { LoginUserRequestDto } from '../../application/dto/login-user-request.dto';
import { LoginUserCommand } from '../../application/commands/login-user.command';
import { JwtAuthGuard } from '../../infrastructure/authentication/jwt-auth.guard';
import { CurrentUser } from '../current-user.decoraor';
import { type AuthenticatedUser } from '../../domain/entities/authenticated-user';
import { Public } from '../public.decorator';

@Controller(AUTH.BASE)
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Get(AUTH.ME)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Post(AUTH.REGISTER)
  @Public()
  @HttpCode(201)
  async register(@Body() body: RegisterUserRequestDto) {
    return this.commandBus.execute(
      new RegisterUserCommand(body.email, body.username, body.password),
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
}
