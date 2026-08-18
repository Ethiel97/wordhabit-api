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
  BACKFILL_DEFINITIONS_JOB,
  BACKFILL_QUIZ_MATERIAL_JOB,
  GENERATE_VOCABULARY_BATCH_JOB,
  VOCABULARY_QUEUE,
} from '../../../modules/vocabulary-ingestion/infrastructure/queue/vocabulary-queue.constants';
import { SentryReportingWorkerHost } from './sentry-reporting-processor';
import { VocabularyGenerationQuotaExceededError } from '../../../modules/vocabulary-ingestion/domain/errors/vocabulary-generation-quota-exceeded.error';
import {
  BackfillQuizMaterialCommand,
  type BackfillQuizMaterialResult,
} from '../../../modules/vocabulary-ingestion/application/commands/backfill-quiz-material.command';
import { BackfillQuizMaterialRequestDto } from '../../../modules/vocabulary-ingestion/application/dto/backfill-quiz-material.request.dto';
import {
  BackfillDefinitionsCommand,
  type BackfillDefinitionsResult,
} from '../../../modules/vocabulary-ingestion/application/commands/backfill-definitions.command';
import { BackfillDefinitionsRequestDto } from '../../../modules/vocabulary-ingestion/application/dto/backfill-definitions.request.dto';

/**
 * Runs the nightly vocabulary batch. Transport only: generation belongs
 * to `GenerateVocabularyBatchHandler`, so the scheduled and HTTP paths
 * share one implementation. It was reimplemented here once, which left
 * the handler dead and every improvement in the copy nothing called.
 */
@Processor(VOCABULARY_QUEUE)
export class GenerateVocabularyBatchProcessor extends SentryReportingWorkerHost {
  private readonly logger = new Logger(GenerateVocabularyBatchProcessor.name);

  constructor(private readonly commandBus: CommandBus) {
    super();
  }

  async process(job: Job) {
    if (job.name === BACKFILL_QUIZ_MATERIAL_JOB) {
      return this.processBackfill(job);
    }

    if (job.name === BACKFILL_DEFINITIONS_JOB) {
      return this.processDefinitionBackfill(job);
    }

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
      // Certain to repeat: credit does not come back between two
      // backoffs, so retrying raises three alerts for one cause.
      if (error instanceof VocabularyGenerationQuotaExceededError) {
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }

    // The number to watch: once "already known" dominates, the batch is
    // burning budget for no new ground.
    this.logger.log(
      `${targetLanguage}: ${result.createdCount} created, ` +
        `${result.skippedCount} already known, ${result.failedCount} rejected ` +
        `(of ${result.generatedCount} generated)`,
    );

    return result;
  }

  private async processDefinitionBackfill(job: Job) {
    const { targetLanguage, explanationLanguage, count } =
      job.data as BackfillDefinitionsRequestDto;

    let result: BackfillDefinitionsResult;
    try {
      result = await this.commandBus.execute(
        new BackfillDefinitionsCommand(
          targetLanguage,
          explanationLanguage,
          count,
        ),
      );
    } catch (error) {
      if (error instanceof VocabularyGenerationQuotaExceededError) {
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }

    this.logger.log(
      `Definition backfill ${targetLanguage}/${explanationLanguage}: ` +
        `${result.enrichedCount} enriched, ${result.skippedCount} skipped, ` +
        `${result.failedCount} failed — ${result.remaining - result.enrichedCount} still missing it`,
    );

    return result;
  }

  private async processBackfill(job: Job) {
    const { count } = job.data as BackfillQuizMaterialRequestDto;

    let result: BackfillQuizMaterialResult;
    try {
      result = await this.commandBus.execute(
        new BackfillQuizMaterialCommand(count),
      );
    } catch (error) {
      if (error instanceof VocabularyGenerationQuotaExceededError) {
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }

    this.logger.log(
      `Backfill: ${result.enrichedCount} enriched, ${result.skippedCount} skipped, ` +
        `${result.failedCount} failed — ${result.remaining - result.enrichedCount} words still without scenarios`,
    );

    return result;
  }
}
