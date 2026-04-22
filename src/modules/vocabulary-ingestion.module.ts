import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { VocabularyModule } from './vocabulary/vocabulary.module';
import { VocabularyIngestionController } from './vocabulary-ingestion/presentation/http/vocabulary-ingestion.controller';
import { GenerateVocabularyBatchHandler } from './vocabulary-ingestion/application/handlers/generate-vocabulary-batch.handler';
import { VOCABULARY_GENERATION_PROVIDER } from './vocabulary-ingestion/domain/providers/vocabulary-generation.provider';
import { OpenAiVocabularyGenerationProvider } from './vocabulary-ingestion/infrastructure/providers/openai/openai-vocabulary-generation.provider';

const CommandHandlers = [GenerateVocabularyBatchHandler];

@Module({
  imports: [CqrsModule, VocabularyModule],
  controllers: [VocabularyIngestionController],
  providers: [
    ...CommandHandlers,
    OpenAiVocabularyGenerationProvider,
    {
      provide: VOCABULARY_GENERATION_PROVIDER,
      useExisting: OpenAiVocabularyGenerationProvider,
    },
  ],
})
export class VocabularyIngestionModule {}
