import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MailerModule } from '../../shared/infrastructure/mailer/mailer.module';
import { AUTH_EMAIL_QUEUE } from './infrastructure/queue/auth-email-queue.constants';
import { AuthEmailsProcessor } from './infrastructure/queue/auth-emails.processor';
import {
  ACCOUNT_PURGE_JOBS,
  ACCOUNT_PURGE_QUEUE,
  ACCOUNT_PURGE_SWEEP_CRON,
  ACCOUNT_PURGE_SWEEP_JOB_ID,
} from './infrastructure/queue/account-purge-queue.constants';
import { AccountPurgeProcessor } from './infrastructure/queue/account-purge.processor';
import { AUTH_USER_REPOSITORY } from './domain/repositories/auth-user.repository';
import { PrismaAuthUserRepository } from './infrastructure/persistence/prisma-auth-user.repository';

@Module({
  imports: [
    BullModule.registerQueue({ name: AUTH_EMAIL_QUEUE }),
    BullModule.registerQueue({ name: ACCOUNT_PURGE_QUEUE }),
    MailerModule,
  ],
  providers: [
    AuthEmailsProcessor,
    AccountPurgeProcessor,
    {
      provide: AUTH_USER_REPOSITORY,
      useClass: PrismaAuthUserRepository,
    },
  ],
})
export class AuthWorkerModule implements OnModuleInit {
  constructor(
    @InjectQueue(ACCOUNT_PURGE_QUEUE)
    private readonly accountPurgeQueue: Queue,
  ) {}

  /**
   * Registers the hourly sweep.
   *
   * A BullMQ repeatable job rather than `@nestjs/schedule`: a `@Cron`
   * fires in every replica, so a two-instance deploy would run the sweep
   * twice in parallel. Redis deduplicates this one, and the fixed
   * [ACCOUNT_PURGE_SWEEP_JOB_ID] means a restart re-registers the same
   * schedule instead of stacking another copy.
   */
  async onModuleInit() {
    await this.accountPurgeQueue.add(
      ACCOUNT_PURGE_JOBS.SWEEP,
      {},
      {
        repeat: { pattern: ACCOUNT_PURGE_SWEEP_CRON },
        jobId: ACCOUNT_PURGE_SWEEP_JOB_ID,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
  }
}
