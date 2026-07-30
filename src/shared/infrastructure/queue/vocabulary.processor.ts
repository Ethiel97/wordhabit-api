import { Processor } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { GenerateVocabularyBatchRequestDto } from '../../../modules/vocabulary-ingestion/application/dto/generate-vocabulary-batch.request.dto';
import {
  GenerateVocabularyBatchCommand,
  type GenerateVocabularyBatchResult,
} from '../../../modules/vocabulary-ingestion/application/commands/generate-vocabulary-batch.command';
import {
  GENERATE_VOCABULARY_BATCH_JOB,
  VOCABULARY_QUEUE,
} from '../../../modules/vocabulary-ingestion/infrastructure/queue/vocabulary-queue.constants';
import { SentryReportingWorkerHost } from './sentry-reporting-processor';
import { VocabularyGenerationQuotaExceededError } from '../../../modules/vocabulary-ingestion/domain/errors/vocabulary-generation-quota-exceeded.error';

/**
 * Runs the nightly vocabulary batch.
 *
 * Transport only: it turns a job into the command and reports the
 * outcome. Generation itself — themes, exclusion list, exploration
 * brief, quality gate, persistence — belongs to
 * `GenerateVocabularyBatchHandler`, so the scheduled path and the HTTP
 * path go through the same code. It used to be reimplemented here, which
 * meant the handler was dead code and every improvement landed in the
 * copy that nothing called.
 */
@Processor(VOCABULARY_QUEUE)
export class GenerateVocabularyBatchProcessor extends SentryReportingWorkerHost {
  private readonly logger = new Logger(GenerateVocabularyBatchProcessor.name);

  constructor(private readonly commandBus: CommandBus) {
    super();
  }

  async process(job: Job) {
    if (job.name !== GENERATE_VOCABULARY_BATCH_JOB) {
      this.logger.warn(`Unknown job ${job.name} (${job.id}) — skipping`);
      return;
    }

    const { targetLanguage, explanationLanguage, count } =
      job.data as GenerateVocabularyBatchRequestDto;

    let result: GenerateVocabularyBatchResult;
    try {
      result = await this.commandBus.execute(
        new GenerateVocabularyBatchCommand(
          targetLanguage,
          explanationLanguage,
          count,
        ),
      );
    } catch (error) {
      // The one failure that is certain to repeat: credit does not come
      // back between two exponential backoffs. Retrying it three times
      // buys nothing and raises three alerts for a single cause.
      if (error instanceof VocabularyGenerationQuotaExceededError) {
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }

    // The yield is the number to watch: once "already known" dominates,
    // the exclusion list is no longer buying new ground and the batch is
    // burning budget for nothing.
    this.logger.log(
      `${targetLanguage}: ${result.createdCount} created, ` +
        `${result.skippedCount} already known, ${result.failedCount} rejected ` +
        `(of ${result.generatedCount} generated)`,
    );

    return result;
  }
}
