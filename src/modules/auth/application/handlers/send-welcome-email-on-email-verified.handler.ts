import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EmailVerifiedEvent } from '../../domain/events/email-verified.event';
import {
  AUTH_EMAIL_QUEUE,
  SEND_WELCOME_EMAIL_JOB,
  SendWelcomeEmailJobData,
} from '../../infrastructure/queue/auth-email-queue.constants';

@EventsHandler(EmailVerifiedEvent)
export class SendWelcomeEmailOnEmailVerifiedHandler implements IEventHandler<EmailVerifiedEvent> {
  private readonly logger = new Logger(
    SendWelcomeEmailOnEmailVerifiedHandler.name,
  );

  constructor(
    @InjectQueue(AUTH_EMAIL_QUEUE)
    private readonly authEmailQueue: Queue,
  ) {}

  async handle(event: EmailVerifiedEvent): Promise<void> {
    const jobData: SendWelcomeEmailJobData = {
      email: event.email,
      name: event.name,
    };

    try {
      await this.authEmailQueue.add(SEND_WELCOME_EMAIL_JOB, jobData, {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
      this.logger.log(`Welcome email enqueued for user ${event.userId}`);
    } catch (error) {
      // The user is already verified; a lost welcome email must not surface
      // as a failure anywhere in the verification flow.
      this.logger.error(
        `Failed to enqueue welcome email for user ${event.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
