import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './shared/infrastructure/database/database.module';
import { QueueModule } from './shared/infrastructure/queue/queue.module';
import { VocabularyModule } from './modules/vocabulary/vocabulary.module';
import { VocabularyIngestionWorkerModule } from './modules/vocabulary-ingestion/vocabulary-ingestion-worker.module';
import { AuthWorkerModule } from './modules/auth/auth-worker.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    QueueModule,
    VocabularyModule,
    VocabularyIngestionWorkerModule,
    AuthWorkerModule,
  ],
})
export class WorkerAppModule {}
