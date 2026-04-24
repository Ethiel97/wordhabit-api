import { BullModule } from '@nestjs/bullmq';
import { VOCABULARY_QUEUE } from './infrastructure/queue/vocabulary-queue.constants';
import { GenerateVocabularyBatchProcessor } from '../../shared/infrastructure/queue/vocabulary.processor';
import { VocabularyDailyScheduler } from './application/schedulers/vocabulary-daily.scheduler';
import { OpenAiVocabularyGenerationProvider } from './infrastructure/providers/openai/openai-vocabulary-generation.provider';
import { VOCABULARY_GENERATION_PROVIDER } from './domain/providers/vocabulary-generation.provider';
import { Module } from '@nestjs/common';
import { VocabularyModule } from '../vocabulary/vocabulary.module';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [
    CqrsModule,
    VocabularyModule,
    BullModule.registerQueue({
      name: VOCABULARY_QUEUE,
    }),
  ],
  providers: [
    GenerateVocabularyBatchProcessor,
    VocabularyDailyScheduler,
    OpenAiVocabularyGenerationProvider,
    {
      provide: VOCABULARY_GENERATION_PROVIDER,
      useExisting: OpenAiVocabularyGenerationProvider,
    },
  ],
})
export class VocabularyIngestionWorkerModule {}
