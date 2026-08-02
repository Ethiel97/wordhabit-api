import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  NOTIFICATIONS_SENDER_QUEUE,
  SEND_DAILY_WORD_NOTIFICATION_JOB,
} from '../../infrastructure/queue/notifications-queue.constants';

/**
 * Wakes the sweep every half hour; the processor decides who is due.
 *
 * No `timeZone`: the reminder slot is local to each user, so the tick
 * runs in UTC and the processor converts. Pinning a zone here would tie
 * every user's schedule to that one.
 */
@Injectable()
export class DailyWordScheduler {
  private readonly logger = new Logger(DailyWordScheduler.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_SENDER_QUEUE) private readonly queue: Queue,
  ) {}

  @Cron('0 */30 * * * *', {
    name: 'dailyWordSweep',
    waitForCompletion: true,
  })
  async enqueueDailyWordJob() {
    const tickAt = new Date();
    // Truncated to the half hour so every instance computes the same id
    // for the same tick — BullMQ then rejects the duplicate.
    const jobId = `daily-word:${floorToHalfHour(tickAt).toISOString()}`;

    try {
      await this.queue.add(
        SEND_DAILY_WORD_NOTIFICATION_JOB,
        // The tick's own instant, not the processor's clock: a job that
        // waits in the queue must still sweep the window it was made for.
        { tickAt: tickAt.toISOString() },
        // attempts: 1 — a partly-done sweep replayed sends twice, and
        // the next tick picks up whatever was missed anyway.
        { jobId, attempts: 1, removeOnComplete: 100, removeOnFail: 500 },
      );
    } catch (error) {
      this.logger.error(`Failed to enqueue ${jobId}: ${error}`);
    }
  }
}

function floorToHalfHour(date: Date): Date {
  const floored = new Date(date);
  floored.setUTCMinutes(floored.getUTCMinutes() < 30 ? 0 : 30, 0, 0);
  return floored;
}
