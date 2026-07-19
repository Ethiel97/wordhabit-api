import { Processor } from '@nestjs/bullmq';
import {
  SEND_WAITLIST_CONFIRMATION_EMAIL_JOB,
  SendWaitlistConfirmationEmailJobData,
  WAITLIST_QUEUE,
} from './waitlist-queue.constants';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';

import {
  MAILER,
  type Mailer,
} from '../../../../shared/application/ports/mailer.port';
import { EmailTemplates } from '../../../../shared/infrastructure/mailer/resend-mailer.service';
import { SentryReportingWorkerHost } from '../../../../shared/infrastructure/queue/sentry-reporting-processor';

@Processor(WAITLIST_QUEUE)
export class WaitlistProcessor extends SentryReportingWorkerHost {
  private readonly logger = new Logger(WaitlistProcessor.name);
  constructor(
    @Inject(MAILER)
    private readonly mailer: Mailer,
  ) {
    super();
  }
  async process(job: Job) {
    switch (job.name) {
      case SEND_WAITLIST_CONFIRMATION_EMAIL_JOB:
        return this.sendWaitlistConfirmationEmail(
          job as Job<SendWaitlistConfirmationEmailJobData>,
        );
    }
  }

  private async sendWaitlistConfirmationEmail(
    job: Job<SendWaitlistConfirmationEmailJobData>,
  ) {
    const { email } = job.data;

    this.logger.log(
      `Sending waitlist confirmation email to ${email} (job ${job.id})`,
    );

    await this.mailer.send({
      to: email,
      template: {
        id: EmailTemplates.WAITLIST_CONFIRMATION,
      },
      subject: "You're on the list - Wordhabit",
      text: [
        `Hi,`,
        '',
        `Thanks for joining the Wordhabit waitlist!`,
        '',
        'We will notify you when we launch.',
        '',
        'If you did not sign up for the waitlist, you can safely ignore this email.',
      ].join('\n'),
    });
  }
}
