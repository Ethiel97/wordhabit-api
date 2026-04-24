import { Module } from '@nestjs/common';
import { VocabularyIngestionController } from './presentation/http/vocabulary-ingestion.controller';
import { BullModule } from '@nestjs/bullmq';
import { VOCABULARY_QUEUE } from './infrastructure/queue/vocabulary-queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: VOCABULARY_QUEUE,
    }),
  ],
  controllers: [VocabularyIngestionController],
})
export class VocabularyIngestionModule {}
