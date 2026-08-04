import { Processor } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SentryReportingWorkerHost } from './sentry-reporting-processor';
import {
  NOTIFICATIONS_SENDER_QUEUE,
  SEND_DAILY_WORD_NOTIFICATION_JOB,
} from '../../../modules/notifications/infrastructure/queue/notifications-queue.constants';
import {
  NOTIFICATION_REPOSITORY,
  type DueRecipient,
  type NotificationRepository,
} from '../../../modules/notifications/domain/repositories/notification.repository';
import {
  PUSH_SENDER,
  type PushMessage,
  type PushSender,
} from '../../application/ports/push-sender.port';
import {
  DueSlot,
  findDueSlots,
} from '../../../modules/notifications/domain/daily-word-schedule';
import { dailyWordCopy } from '../../../modules/notifications/domain/daily-word-copy';
import { NotificationChannel } from '../../../modules/notifications/domain/entities/notification';
import { TodayWordService } from '../../../modules/learning/application/services/today-word.service';

/** Must match the channel MainActivity creates on Android. */
const ANDROID_CHANNEL_ID = 'daily_word';

@Processor(NOTIFICATIONS_SENDER_QUEUE)
export class DailyWordSenderProcessor extends SentryReportingWorkerHost {
  private readonly logger = new Logger(DailyWordSenderProcessor.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(PUSH_SENDER)
    private readonly pushSender: PushSender,
    private readonly todayWord: TodayWordService,
  ) {
    super();
  }

  async process(job: Job<{ tickAt: string }>) {
    if (job.name !== SEND_DAILY_WORD_NOTIFICATION_JOB) {
      this.logger.warn(`Unknown job ${job.name} (${job.id}) — skipping`);
      return { notified: 0 };
    }

    // The tick's instant, not the clock: a queued job must still sweep
    // the window it was created for.
    const timeZones = await this.notifications.findActiveTimeZones();
    const due = findDueSlots(new Date(job.data.tickAt), timeZones);

    let notified = 0;
    for (const slot of due) {
      notified += await this.notifySlot(slot);
    }

    if (notified > 0) {
      this.logger.log(
        `Notified ${notified} user(s) over ${due.length} slot(s)`,
      );
    }

    return { notified };
  }

  private async notifySlot(due: DueSlot): Promise<number> {
    const recipients = await this.notifications.findDueRecipients({
      channel: NotificationChannel.DAILY_WORD,
      timeZone: due.timeZone,
      slot: due.slot,
      localDate: due.localDate,
    });

    const messages = await this.claim(recipients, due);
    if (messages.length === 0) return 0;

    const result = await this.pushSender.send(messages);

    // Devices the platform reports as gone: left in place they grow
    // every batch.
    if (result.invalidTokens.length > 0) {
      const removed = await this.notifications.deleteDevicesByTokens(
        result.invalidTokens,
      );
      this.logger.log(`Removed ${removed} dead device(s)`);
    }

    return messages.length;
  }

  /**
   * Assigns the day's word, then reserves the delivery. That order twice
   * over: the push carries a wordId, and a user with no candidate must
   * not be marked as served or tomorrow's sweep skips them.
   *
   * The reservation's unique index is what stops a second worker from
   * notifying twice. A send failing after the claim costs a missed day,
   * which beats a double notification.
   */
  private async claim(
    recipients: DueRecipient[],
    due: DueSlot,
  ): Promise<PushMessage[]> {
    const messages: PushMessage[] = [];

    for (const recipient of recipients) {
      if (recipient.tokens.length === 0) continue;

      let word: { id: string; term: string };
      try {
        const assignment = await this.todayWord.getOrAssignTodayWord(
          recipient.userId,
          due.localDate,
        );
        word = { id: assignment.word.id, term: assignment.word.term };
      } catch (error) {
        // No profile, or a dry corpus: not worth abandoning the batch.
        this.logger.warn(
          `No word for user ${recipient.userId}: ${String(error)}`,
        );
        continue;
      }

      const isOurs = await this.notifications.recordDelivery({
        userId: recipient.userId,
        channel: NotificationChannel.DAILY_WORD,
        localDate: due.localDate,
      });

      if (isOurs) messages.push(this.compose(recipient, word));
    }

    return messages;
  }

  private compose(
    recipient: DueRecipient,
    word: { id: string; term: string },
  ): PushMessage {
    const copy = dailyWordCopy(recipient.interfaceLanguage, word.term);

    return {
      tokens: recipient.tokens,
      title: copy.title,
      body: copy.body,
      data: {
        type: NotificationChannel.DAILY_WORD,
        wordId: word.id,
        sentAt: new Date().toISOString(),
      },
      androidChannelId: ANDROID_CHANNEL_ID,
    };
  }
}
