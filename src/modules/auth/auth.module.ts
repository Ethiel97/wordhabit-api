import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PASSWORD_SERVICE } from './domain/services/password-service';
import { BcryptPasswordService } from './infrastructure/hashing/bcrypt-password.service';
import { TOKEN_SERVICE } from './domain/services/token-service';
import { JwtTokenService } from './infrastructure/jwt/jwt-token.service';
import { AUTH_USER_REPOSITORY } from './domain/repositories/auth-user.repository';
import { PrismaAuthUserRepository } from './infrastructure/persistence/prisma-auth-user.repository';
import { AuthController } from './presentation/http/auth.controller';
import { RegisterUserHandler } from './application/handlers/register-user.handler';
import { LoginUserHandler } from './application/handlers/login-user.handler';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './infrastructure/authentication/jwt.strategy';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './infrastructure/authentication/jwt-auth.guard';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule, ConfigService } from '@nestjs/config';

const commandHandlers = [RegisterUserHandler, LoginUserHandler];

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    CqrsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    ...commandHandlers,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: PASSWORD_SERVICE,
      useClass: BcryptPasswordService,
    },
    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenService,
    },
    {
      provide: AUTH_USER_REPOSITORY,
      useClass: PrismaAuthUserRepository,
    },
  ],
  exports: [PASSWORD_SERVICE, TOKEN_SERVICE, AUTH_USER_REPOSITORY],
})
export class AuthModule {}
