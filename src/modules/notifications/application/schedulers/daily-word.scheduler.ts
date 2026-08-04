import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  NOTIFICATIONS_SENDER_QUEUE,
  SEND_DAILY_WORD_NOTIFICATION_JOB,
} from '../../infrastructure/queue/notifications-queue.constants';

/**
 * Wakes the sweep every half hour; the processor decides who is due. No
 * `timeZone`: the slot is local to each user, and pinning one here would
 * tie every schedule to it.
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
    // Truncated to the half hour, so every instance computes the same
    // id and BullMQ rejects the duplicate.
    const jobId = toJobId('daily-word', floorToHalfHour(tickAt));

    try {
      await this.queue.add(
        SEND_DAILY_WORD_NOTIFICATION_JOB,
        // The tick's instant, not the processor's clock: a queued job
        // must still sweep the window it was made for.
        { tickAt: tickAt.toISOString() },
        // attempts: 1. A replayed half-done sweep sends twice, and the
        // next tick picks up whatever was missed.
        { jobId, attempts: 1, removeOnComplete: 100, removeOnFail: 500 },
      );
    } catch (error) {
      this.logger.error(`Failed to enqueue ${jobId}: ${error}`);
    }
  }
}

/**
 * A deterministic, BullMQ-safe job id. BullMQ rejects a custom id
 * containing `:`, the separator of its own Redis keys, and an ISO
 * timestamp is full of them. The rejection is caught, so the sweep just
 * stops happening.
 */
export function toJobId(prefix: string, at: Date): string {
  return `${prefix}-${at.toISOString().replace(/[:.]/g, '-')}`;
}

function floorToHalfHour(date: Date): Date {
  const floored = new Date(date);
  floored.setUTCMinutes(floored.getUTCMinutes() < 30 ? 0 : 30, 0, 0);
  return floored;
}
