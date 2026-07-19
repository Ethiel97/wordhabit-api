import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as Sentry from '@sentry/nestjs';

export abstract class SentryReportingWorkerHost extends WorkerHost {
  @OnWorkerEvent('failed')
  reportFailedJob(job: Job | undefined, error: Error): void {
    const attemptsAllowed = job?.opts.attempts ?? 1;
    const isFinalFailure = !job || job.attemptsMade >= attemptsAllowed;
    if (!isFinalFailure) return; // ne pas alerter à chaque retry

    Sentry.captureException(error, {
      tags: { queue: job?.queueName, jobName: job?.name },
      extra: { jobId: job?.id, attemptsMade: job?.attemptsMade },
    });
  }
}
