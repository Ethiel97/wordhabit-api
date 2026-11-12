import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import {
  SEND_STREAK_RISK_NOTIFICATION_JOB,
  STREAK_RISK_QUEUE,
} from '../../infrastructure/queue/notifications-queue.constants';
import { floorToHalfHour, toJobId } from './daily-word.scheduler';

export const STREAK_RISK_ENABLED_KEY = 'STREAK_RISK_PUSH_ENABLED';

@Injectable()
export class StreakRiskScheduler {
  private readonly logger = new Logger(StreakRiskScheduler.name);

  constructor(
    @InjectQueue(STREAK_RISK_QUEUE) private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  @Cron('0 */30 * * * *', {
    name: 'streakRiskSweep',
    waitForCompletion: true,
  })
  async enqueueStreakRiskJob() {
    if (this.config.get<string>(STREAK_RISK_ENABLED_KEY) !== 'true') return;

    const tickAt = new Date();
    const jobId = toJobId('streak-risk', floorToHalfHour(tickAt));

    try {
      await this.queue.add(
        SEND_STREAK_RISK_NOTIFICATION_JOB,
        { tickAt: tickAt.toISOString() },
        {
          jobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to enqueue ${jobId}: ${error}`);
    }
  }
}
