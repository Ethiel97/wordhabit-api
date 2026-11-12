import { Processor } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SentryReportingWorkerHost } from './sentry-reporting-processor';
import {
  SEND_STREAK_RISK_NOTIFICATION_JOB,
  STREAK_RISK_QUEUE,
} from '../../../modules/notifications/infrastructure/queue/notifications-queue.constants';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
  type StreakRiskRecipient,
} from '../../../modules/notifications/domain/repositories/notification.repository';
import {
  PUSH_SENDER,
  type PushMessage,
  type PushSender,
} from '../../application/ports/push-sender.port';
import {
  DueStreakRiskZone,
  findDueStreakRiskZones,
} from '../../../modules/notifications/domain/streak-risk-schedule';
import { getStreakRiskCopy } from '../../../modules/notifications/domain/streak-risk-copy';
import { NotificationChannel } from '../../../modules/notifications/domain/entities/notification';

/** Must match notification_channel_streak_risk_id in the app's strings.xml. */
const ANDROID_CHANNEL_ID = 'streak_risk';

@Processor(STREAK_RISK_QUEUE)
export class StreakRiskSenderProcessor extends SentryReportingWorkerHost {
  private readonly logger = new Logger(StreakRiskSenderProcessor.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(PUSH_SENDER)
    private readonly pushSender: PushSender,
  ) {
    super();
  }

  async process(job: Job<{ tickAt: string }>) {
    if (job.name !== SEND_STREAK_RISK_NOTIFICATION_JOB) {
      this.logger.warn(`Unknown job ${job.name} (${job.id}), skipping`);
      return { notified: 0 };
    }

    const timeZones = await this.notifications.findActiveTimeZones();
    const due = findDueStreakRiskZones(new Date(job.data.tickAt), timeZones);

    let notified = 0;
    for (const zone of due) {
      notified += await this.notifyZone(zone);
    }

    if (notified > 0) {
      this.logger.log(
        `Nudged ${notified} learner(s) over ${due.length} zone(s)`,
      );
    }

    return { notified };
  }

  private async notifyZone(zone: DueStreakRiskZone): Promise<number> {
    const recipients = await this.notifications.findStreakRiskRecipients(zone);

    const messages: PushMessage[] = [];
    for (const recipient of recipients) {
      if (recipient.tokens.length === 0) continue;

      const isOurs = await this.notifications.recordDelivery({
        userId: recipient.userId,
        channel: NotificationChannel.STREAK_RISK,
        localDate: zone.localDate,
      });

      if (isOurs) messages.push(this.compose(recipient));
    }

    if (messages.length === 0) return 0;

    const result = await this.pushSender.send(messages);

    if (result.invalidTokens.length > 0) {
      const removed = await this.notifications.deleteDevicesByTokens(
        result.invalidTokens,
      );
      this.logger.log(`Removed ${removed} dead device(s)`);
    }

    return messages.length;
  }

  private compose(recipient: StreakRiskRecipient): PushMessage {
    const copy = getStreakRiskCopy(
      recipient.currentStreak,
      recipient.interfaceLanguage,
    );

    return {
      tokens: recipient.tokens,
      title: copy.title,
      body: copy.body,
      data: {
        type: NotificationChannel.STREAK_RISK,
        sentAt: new Date().toISOString(),
      },
      androidChannelId: ANDROID_CHANNEL_ID,
    };
  }
}
