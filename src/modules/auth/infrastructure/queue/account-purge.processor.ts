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
 * Erases accounts whose grace period has run out. A sweep rather than a
 * job delayed 30 days: flush Redis and a delayed job strands its account
 * in limbo forever, while a sweep re-reads the truth every hour.
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

    // `deletedAt <= now - grace` rather than `now >= deletedAt +
    // grace`: the same test, but it leaves the column bare for the
    // index.
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
        // Stepped over rather than thrown: the next sweep retries it.
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
