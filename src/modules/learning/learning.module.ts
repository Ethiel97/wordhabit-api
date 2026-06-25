import { Module } from '@nestjs/common';
import { LearningController } from './presentation/http/learning.controller';
import { VocabularyModule } from '../vocabulary/vocabulary.module';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaLearningRepository } from './infrastructure/persistence/prisma-learning.repository';
import { LEARNING_REPOSITORY } from './domain/repositories/learning.repository';
import { UserLearningModule } from '../user-learning/user-learning.module';
import { GetTodayWordForUserHandler } from './application/handlers/get-today-word-for-user.handler';
import { GetUserWordProgressHandler } from './application/handlers/get-user-word-progress.handler';
import { GetRandomWordForLandingHandler } from './application/handlers/get-random-word-for-landing.handler';
import { SetUserWordProgressHandler } from './application/handlers/set-user-word-progress.handler';
import { GetReviewQueueHandler } from './application/handlers/get-review-queue.handler';

const commandHandlers = [SetUserWordProgressHandler];
const queryHandlers = [
  GetTodayWordForUserHandler,
  GetUserWordProgressHandler,
  GetRandomWordForLandingHandler,
  GetReviewQueueHandler,
];

@Module({
  imports: [VocabularyModule, UserLearningModule, CqrsModule],
  controllers: [LearningController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    {
      provide: LEARNING_REPOSITORY,
      useClass: PrismaLearningRepository,
    },
  ],
})
export class LearningModule {}
