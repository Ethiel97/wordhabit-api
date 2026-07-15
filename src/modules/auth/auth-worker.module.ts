import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailerModule } from '../../shared/infrastructure/mailer/mailer.module';
import { AUTH_EMAIL_QUEUE } from './infrastructure/queue/auth-email-queue.constants';
import { AuthEmailsProcessor } from './infrastructure/queue/auth-emails.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: AUTH_EMAIL_QUEUE,
    }),
    MailerModule,
  ],
  providers: [AuthEmailsProcessor],
})
export class AuthWorkerModule {}
