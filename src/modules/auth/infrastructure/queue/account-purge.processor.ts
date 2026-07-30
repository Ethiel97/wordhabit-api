import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import {
  ACCOUNT_PURGE_JOBS,
  ACCOUNT_PURGE_QUEUE,
} from './account-purge-queue.constants';
import {
  AUTH_USER_REPOSITORY,
  type AuthUserRepository,
} from '../../domain/repositories/auth-user.repository';
import { purgeCutoff } from '../../domain/account-deletion.policy';
import { SentryReportingWorkerHost } from '../../../../shared/infrastructure/queue/sentry-reporting-processor';

/**
 * Erases accounts whose 30-day grace period has run out.
 *
 * A periodic sweep rather than a job delayed by 30 days at deletion
 * time: a delayed job is a single point of failure — flush Redis, or
 * re-provision it, and the account is stranded in limbo forever. A sweep
 * reads the truth out of the database every hour, so it catches whatever
 * was missed, however it was missed.
 */
@Processor(ACCOUNT_PURGE_QUEUE)
export class AccountPurgeProcessor extends SentryReportingWorkerHost {
  private readonly logger = new Logger(AccountPurgeProcessor.name);

  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name !== ACCOUNT_PURGE_JOBS.SWEEP) {
      this.logger.warn(`Unknown job ${job.name} (${job.id}) — skipping`);
      return;
    }

    // An account is due when `now >= deletedAt + grace`, which is the
    // same as `deletedAt <= now - grace`. The second form is the one we
    // can query: it leaves `deletedAt` bare, so the index does the work.
    const deletedBefore = purgeCutoff(new Date());
    const due = await this.authUserRepository.findPurgeable(deletedBefore);

    if (due.length === 0) {
      return { purged: 0 };
    }

    let purged = 0;
    for (const user of due) {
      try {
        await this.authUserRepository.purge(user.id);
        purged++;
      } catch (error) {
        // One bad row must not abandon the rest of the batch, and the
        // next sweep will retry it — so this is logged and stepped over
        // rather than thrown.
        this.logger.error(
          `Failed to purge account ${user.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    this.logger.log(`Purged ${purged}/${due.length} expired accounts`);

    return { purged };
  }
}
