import { WaitlistJoinedEvent } from '../../domain/events/waitlist-joined.event';
import { InjectQueue } from '@nestjs/bullmq';
import {
  SEND_WAITLIST_CONFIRMATION_EMAIL_JOB,
  SendWaitlistConfirmationEmailJobData,
  WAITLIST_QUEUE,
} from '../../infrastructure/queue/waitlist-queue.constants';
import { Queue } from 'bullmq';

import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';

@EventsHandler(WaitlistJoinedEvent)
export class SendWaitlistConfirmationEmailHandler implements IEventHandler<WaitlistJoinedEvent> {
  private readonly logger = new Logger(
    SendWaitlistConfirmationEmailHandler.name,
  );
  constructor(
    @InjectQueue(WAITLIST_QUEUE)
    private readonly waitlistQueue: Queue,
  ) {}

  async handle(event: WaitlistJoinedEvent): Promise<void> {
    const { email } = event;

    const jobData: SendWaitlistConfirmationEmailJobData = {
      email,
    };

    try {
      await this.waitlistQueue.add(
        SEND_WAITLIST_CONFIRMATION_EMAIL_JOB,
        jobData,
        {
          removeOnComplete: true,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
    } catch (e) {
      this.logger.error(
        `Failed to enqueue waitlist confirmation email for ${email}`,
        e instanceof Error ? e.stack : String(e),
      );
    }
  }
}
