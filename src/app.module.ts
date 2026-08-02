import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { DatabaseModule } from './shared/infrastructure/database/database.module';
import { VocabularyModule } from './modules/vocabulary/vocabulary.module';
import { VocabularyIngestionModule } from './modules/vocabulary-ingestion/vocabulary-ingestion.module';
import { QueueModule } from './shared/infrastructure/queue/queue.module';
import { HealthModule } from './modules/health/health.module';
import { UserLearningModule } from './modules/user-learning/user-learning.module';
import { LearningModule } from './modules/learning/learning.module';
import { SentryModule } from '@sentry/nestjs/setup';
import { AuthModule } from './modules/auth/auth.module';
import { NestLensModule } from 'nestlens';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    NestLensModule.forRoot({
      enabled: process.env.NODE_ENV !== 'production',
    }),
    NotificationsModule,
    HealthModule,
    DatabaseModule,
    QueueModule,
    LearningModule,
    UserLearningModule,
    VocabularyModule,
    VocabularyIngestionModule,
    WaitlistModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
