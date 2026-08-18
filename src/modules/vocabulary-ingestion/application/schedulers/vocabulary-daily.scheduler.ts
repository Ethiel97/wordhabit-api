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

/**
 * Words swept per pass. Above the sixty the generator adds, so the
 * legacy gap shrinks every pass instead of only holding level; within
 * the HTTP endpoint's own cap of 100.
 */
const BACKFILL_SIZE = 80;

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
  async enqueueGeneration() {
    // English only, because every planned market learns English:
    // francophones, then non-native professionals, then native word
    // lovers. FR and ES as *target* languages are paused — they serve
    // people learning French or Spanish, whom no phase addresses, and
    // they had grown to twice the English corpus.
    //
    // Weighted towards English definitions: 610 English words carry a
    // French one and only 178 an English one, and a reader whose
    // language is missing is served `definitions.first`, so today an
    // anglophone meets French prose.
    const payloads = [
      {
        targetLanguage: LanguageCode.EN,
        explanationLanguage: LanguageCode.FR,
        count: DAILY_BATCH_SIZE,
      },
      {
        targetLanguage: LanguageCode.EN,
        explanationLanguage: LanguageCode.EN,
        count: DAILY_BATCH_SIZE * 2,
      },
    ];

    for (const payload of payloads) {
      // Passed to add(), not just logged: BullMQ drops a duplicate id
      // silently, which is what keeps a second API instance from
      // generating the same batch twice.
      //
      // Both languages are in the id. Keyed on the target alone, two
      // batches differing only by explanation language collided and the
      // second was discarded without an error — which is what the two
      // Spanish batches did, every night, unnoticed.
      //
      // Hyphens, not colons: BullMQ reserves `:` for its own Redis keys
      // and rejects a custom id that contains one.
      const day = new Date().toISOString().split('T')[0];
      const jobId = `daily-${payload.targetLanguage}-${payload.explanationLanguage}-${day}`;
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
        this.logger.log(`Enqueued job ${jobId} for ${payload.targetLanguage}`);
      } catch (error) {
        // One language failing to enqueue must not drop the others.
        this.logger.error(
          `Failed to enqueue job for ${payload.targetLanguage}: ${error}`,
        );
      }
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
   * Gives English words the English and Spanish definitions ingestion
   * could not add: it skips a term the corpus already holds, so words
   * first written for a French reader keep only French prose, and the
   * client serves that to everyone.
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

    for (const explanationLanguage of [LanguageCode.EN, LanguageCode.ES]) {
      const jobId = `definitions-EN-${explanationLanguage}-${hour}`;
      try {
        await this.queue.add(
          BACKFILL_DEFINITIONS_JOB,
          {
            targetLanguage: LanguageCode.EN,
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
          `Failed to enqueue ${explanationLanguage} definition backfill: ${error}`,
        );
      }
    }
  }
}
