import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAILER } from '../../application/ports/mailer.port';
import { ResendMailerService } from './resend-mailer.service';
import { LoggerMailerService } from './logger-mailer.service';

@Module({
  providers: [
    ResendMailerService,
    LoggerMailerService,
    {
      provide: MAILER,
      inject: [ConfigService, ResendMailerService, LoggerMailerService],
      useFactory: (
        configService: ConfigService,
        resendMailer: ResendMailerService,
        loggerMailer: LoggerMailerService,
      ) => {
        const apiKey = configService.get<string>('RESEND_API_KEY')?.trim();
        return apiKey ? resendMailer : loggerMailer;
      },
    },
  ],
  exports: [MAILER],
})
export class MailerModule {}
