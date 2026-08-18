import { Body, Controller, Post } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { GenerateVocabularyBatchRequestDto } from '../../application/dto/generate-vocabulary-batch.request.dto';
import { BackfillQuizMaterialRequestDto } from '../../application/dto/backfill-quiz-material.request.dto';
import { BackfillDefinitionsRequestDto } from '../../application/dto/backfill-definitions.request.dto';
import { ApiSuccessResponse } from '../../../../shared/presentation/http/api-success-response';
import {
  BACKFILL_DEFINITIONS_JOB,
  BACKFILL_QUIZ_MATERIAL_JOB,
  GENERATE_VOCABULARY_BATCH_JOB,
  VOCABULARY_QUEUE,
} from '../../infrastructure/queue/vocabulary-queue.constants';
import { VOCABULARY_INGESTION } from '../../../../shared/presentation/http/endpoints';

type JobBatchResponse = {
  success: boolean;
  jobId: string | number | undefined;
};

@Controller(VOCABULARY_INGESTION.BASE)
export class VocabularyIngestionController {
  constructor(
    @InjectQueue(VOCABULARY_QUEUE)
    private readonly queue: Queue,
  ) {}

  @Post(VOCABULARY_INGESTION.GENERATE_BATCH)
  async generateBatch(@Body() body: GenerateVocabularyBatchRequestDto) {
    const job = await this.queue.add(GENERATE_VOCABULARY_BATCH_JOB, body, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    return ApiSuccessResponse.of<JobBatchResponse>({
      success: true,
      jobId: job.id,
    });
  }

  // Enqueued rather than run inline: a hundred words is many minutes of
  // reasoning-model time, and an HTTP request that long dies at the
  // proxy with the work half-done.
  @Post(VOCABULARY_INGESTION.BACKFILL_QUIZ_MATERIAL)
  async backfillQuizMaterial(@Body() body: BackfillQuizMaterialRequestDto) {
    const job = await this.queue.add(BACKFILL_QUIZ_MATERIAL_JOB, body, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    return ApiSuccessResponse.of<JobBatchResponse>({
      success: true,
      jobId: job.id,
    });
  }

  @Post(VOCABULARY_INGESTION.BACKFILL_DEFINITIONS)
  async backfillDefinitions(@Body() body: BackfillDefinitionsRequestDto) {
    const job = await this.queue.add(BACKFILL_DEFINITIONS_JOB, body, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    return ApiSuccessResponse.of<JobBatchResponse>({
      success: true,
      jobId: job.id,
    });
  }
}
