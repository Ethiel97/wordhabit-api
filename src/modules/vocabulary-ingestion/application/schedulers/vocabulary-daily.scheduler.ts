import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  GENERATE_VOCABULARY_BATCH_JOB,
  VOCABULARY_QUEUE,
} from '../../infrastructure/queue/vocabulary-queue.constants';
import { Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LanguageCode } from '../../../../../generated/prisma/enums';

/**
 * Words generated per language, per night.
 *
 * Ten, not thirty: a user meets one word a day, so 10 × 3 languages
 * still adds a hundred times what anyone consumes. The batch size is
 * bounded by what the corpus needs, not by what one API call can carry —
 * and at a reasoning model's price and latency (roughly three minutes
 * for ten entries) the difference is most of the bill.
 */
const DAILY_BATCH_SIZE = 10;

export class VocabularyDailyScheduler {
  private readonly logger = new Logger(VocabularyDailyScheduler.name);

  constructor(@InjectQueue(VOCABULARY_QUEUE) private readonly queue: Queue) {}

  @Cron('0 0 2 * * *', {
    name: 'dailyVocabularyGeneration',
    timeZone: 'Europe/Paris',
    waitForCompletion: true,
    //enable on Production, keep disabled on staging to avoid unnecessary costs
    disabled: process.env.NODE_ENV !== 'production',
  })
  enqueueGeneration() {
    const payloads = [
      {
        targetLanguage: LanguageCode.EN,
        explanationLanguage: LanguageCode.FR,
        count: DAILY_BATCH_SIZE,
      },
      {
        targetLanguage: LanguageCode.FR,
        explanationLanguage: LanguageCode.EN,
        count: DAILY_BATCH_SIZE,
      },
      {
        targetLanguage: LanguageCode.ES,
        explanationLanguage: LanguageCode.EN,
        count: DAILY_BATCH_SIZE,
      },
      /*{
        targetLanguage: LanguageCode.DE,
        explanationLanguage: LanguageCode.EN,
        count: DAILY_BATCH_SIZE,
      },*/
    ];

    for (const payload of payloads) {
      const jobId = `daily:${payload.targetLanguage}:${new Date().toISOString().split('T')[0]}`;
      this.queue
        .add(GENERATE_VOCABULARY_BATCH_JOB, payload, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 100,
        })
        .then(() => {
          this.logger.log(
            `Enqueued job ${jobId} for ${payload.targetLanguage}`,
          );
        })
        .catch((error) => {
          this.logger.error(
            `Failed to enqueue job for ${payload.targetLanguage}: ${error}`,
          );
        });
    }
  }
}
