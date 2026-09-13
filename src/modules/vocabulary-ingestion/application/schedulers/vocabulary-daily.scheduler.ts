import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  BACKFILL_DEFINITIONS_JOB,
  BACKFILL_QUIZ_MATERIAL_JOB,
  GENERATE_VOCABULARY_BATCH_JOB,
  VOCABULARY_QUEUE,
} from '../../infrastructure/queue/vocabulary-queue.constants';
import { Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';

/**
 * Words generated per batch, per night.
 *
 * Small on purpose: a user meets one word a day, so three batches
 * already add tens of times what anyone consumes. The size is bounded
 * by what the corpus needs, not by what one API call can carry, and at
 * a reasoning model's price and latency the difference is most of the
 * bill.
 */
const DAILY_BATCH_SIZE = 15;

const WEEKLY_BATCH_SIZE = 30;

/**
 * Words swept per pass. Above the sixty the generator adds, so the
 * legacy gap shrinks every pass instead of only holding level; within
 * the HTTP endpoint's own cap of 100.
 */
const BACKFILL_SIZE = 80;

/**
 * Ordered by the readership each pair serves, so a balance that runs
 * out mid-run leaves the common pairs done first.
 */
export const DEFINITION_BACKFILL_PAIRS: ReadonlyArray<{
  targetLanguage: LanguageCode;
  explanationLanguage: LanguageCode;
}> = [
  { targetLanguage: LanguageCode.FR, explanationLanguage: LanguageCode.FR },
  { targetLanguage: LanguageCode.ES, explanationLanguage: LanguageCode.FR },
  { targetLanguage: LanguageCode.EN, explanationLanguage: LanguageCode.FR },
  { targetLanguage: LanguageCode.EN, explanationLanguage: LanguageCode.EN },
  { targetLanguage: LanguageCode.FR, explanationLanguage: LanguageCode.EN },
  { targetLanguage: LanguageCode.ES, explanationLanguage: LanguageCode.EN },
  { targetLanguage: LanguageCode.ES, explanationLanguage: LanguageCode.ES },
  { targetLanguage: LanguageCode.EN, explanationLanguage: LanguageCode.ES },
  { targetLanguage: LanguageCode.FR, explanationLanguage: LanguageCode.ES },
];

export class VocabularyDailyScheduler {
  private readonly logger = new Logger(VocabularyDailyScheduler.name);

  constructor(@InjectQueue(VOCABULARY_QUEUE) private readonly queue: Queue) {}

  /**
   * English only: every planned market learns English. Fifteen a night
   * for the francophone readership the app serves today; the
   * English-explained batch feeds a readership that comes later, so it
   * runs weekly. The cap in the handler bounds the bill either way; the
   * pace is what keeps the backfills level and a bad batch small.
   */
  @Cron('0 0 2 * * *', {
    name: 'dailyVocabularyGeneration',
    timeZone: 'Europe/Paris',
    waitForCompletion: true,
    disabled: process.env.NODE_ENV !== 'production',
  })
  async enqueueGeneration() {
    await this.enqueueGenerationJob('daily', {
      targetLanguage: LanguageCode.EN,
      explanationLanguage: LanguageCode.FR,
      count: DAILY_BATCH_SIZE,
    });
  }

  @Cron('0 30 2 * * 0', {
    name: 'weeklyVocabularyGeneration',
    timeZone: 'Europe/Paris',
    waitForCompletion: true,
    disabled: process.env.NODE_ENV !== 'production',
  })
  async enqueueWeeklyGeneration() {
    await this.enqueueGenerationJob('weekly', {
      targetLanguage: LanguageCode.EN,
      explanationLanguage: LanguageCode.EN,
      count: WEEKLY_BATCH_SIZE,
    });
  }

  /**
   * The id carries both languages and the day: BullMQ drops a duplicate
   * id silently, which is what keeps a second instance from generating
   * the same batch twice. Hyphens only, BullMQ reserves `:`.
   */
  private async enqueueGenerationJob(
    cadence: 'daily' | 'weekly',
    payload: {
      targetLanguage: LanguageCode;
      explanationLanguage: LanguageCode;
      count: number;
    },
  ) {
    const day = new Date().toISOString().split('T')[0];
    const jobId = `${cadence}-${payload.targetLanguage}-${payload.explanationLanguage}-${day}`;
    try {
      await this.queue.add(GENERATE_VOCABULARY_BATCH_JOB, payload, {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      });
      this.logger.log(`Enqueued job ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to enqueue ${jobId}: ${error}`);
    }
  }

  /**
   * Sweeps up the words still missing quiz scenarios: the pre-scenario
   * corpus, and any pass where the generator's response came back
   * without a usable scenario. At convergence the finder returns
   * nothing and the run costs no model time at all — which is what
   * makes four passes a day cheap once the backlog is drained.
   *
   * The 03:30 pass is an hour and a half after generation, so the words
   * written at 02:00 are done being written before they are inspected;
   * the other three exist only to drain the legacy gap faster.
   */
  @Cron('0 30 3,9,15,21 * * *', {
    name: 'dailyQuizMaterialBackfill',
    timeZone: 'Europe/Paris',
    waitForCompletion: true,
    disabled: process.env.NODE_ENV !== 'production',
  })
  async enqueueBackfill() {
    // Hour-granular, not day: BullMQ rejects a duplicate id, so a
    // date-only id would let the 03:30 pass through and silently drop
    // the three that follow it.
    const jobId = `backfill-${new Date().toISOString().slice(0, 13).replace(/[-T:]/g, '-')}`;
    try {
      await this.queue.add(
        BACKFILL_QUIZ_MATERIAL_JOB,
        { count: BACKFILL_SIZE },
        {
          jobId,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      );
      this.logger.log(`Enqueued job ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to enqueue quiz material backfill: ${error}`);
    }
  }

  /**
   * Gives words the definitions ingestion could not add, one pass per
   * language pair: ingestion skips a term the corpus already holds, so
   * words first written for one readership keep only that prose, and
   * the client serves it to everyone.
   *
   * Converges like the quiz backfill — once the finder comes back empty
   * the pass costs no model time — so it can sit on the clock rather
   * than be run by hand and forgotten.
   */
  @Cron('0 45 4,10,16,22 * * *', {
    name: 'dailyDefinitionBackfill',
    timeZone: 'Europe/Paris',
    waitForCompletion: true,
    disabled: process.env.NODE_ENV !== 'production',
  })
  async enqueueDefinitionBackfill() {
    const hour = new Date().toISOString().slice(0, 13).replace(/[-T:]/g, '-');

    for (const {
      targetLanguage,
      explanationLanguage,
    } of DEFINITION_BACKFILL_PAIRS) {
      const jobId = `definitions-${targetLanguage}-${explanationLanguage}-${hour}`;
      try {
        await this.queue.add(
          BACKFILL_DEFINITIONS_JOB,
          {
            targetLanguage,
            explanationLanguage,
            count: BACKFILL_SIZE,
          },
          {
            jobId,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 100,
            removeOnFail: 100,
          },
        );
        this.logger.log(`Enqueued job ${jobId}`);
      } catch (error) {
        this.logger.error(
          `Failed to enqueue ${targetLanguage}/${explanationLanguage} definition backfill: ${error}`,
        );
      }
    }
  }
}
