import { Module } from '@nestjs/common';
import { LearningController } from './presentation/http/learning.controller';
import { VocabularyModule } from '../vocabulary/vocabulary.module';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaQuizRepository } from './infrastructure/persistence/prisma-quiz.repository';
import { QUIZ_REPOSITORY } from './domain/repositories/quiz.repository';
import { PrismaLearningRepository } from './infrastructure/persistence/prisma-learning.repository';
import { LEARNING_REPOSITORY } from './domain/repositories/learning.repository';
import { UserLearningModule } from '../user-learning/user-learning.module';
import { GetTodayWordForUserHandler } from './application/handlers/get-today-word-for-user.handler';
import { GetUserWordProgressHandler } from './application/handlers/get-user-word-progress.handler';
import { GetRandomWordHandler } from './application/handlers/get-random-word.handler';
import { SetUserWordProgressHandler } from './application/handlers/set-user-word-progress.handler';
import { GetReviewQueueHandler } from './application/handlers/get-review-queue.handler';
import { RescheduleWordReviewHandler } from './application/handlers/reschedule-word-review.handler';
import { SubmitWordReviewHandler } from './application/handlers/submit-word-review.handler';
import { GetLearningDashboardHandler } from './application/handlers/get-learning-dashboard.handler';
import { GetUserWordLibraryHandler } from './application/handlers/get-user-word-library.handler';
import { GetUserActivityHandler } from './application/handlers/get-user-activity.handler';
import { GetLearnerXpHandler } from './application/handlers/get-learner-xp.handler';
import { GetUserBadgesHandler } from './application/handlers/get-user-badges.handler';
import { GetWordQuizHandler } from './application/handlers/get-word-quiz.handler';
import { SubmitQuizResultHandler } from './application/handlers/submit-quiz-result.handler';
import { BadgeAwarderService } from './application/services/badge-awarder.service';
import { GetUserActivityDetailHandler } from './application/handlers/get-user-activity-detail.handler';
import { GetUserFavoriteWordsHandler } from './application/handlers/get-user-favorite-words.handler';
import { AddUserFavoriteWordHandler } from './application/handlers/add-user-favorite-word.handler';
import { RemoveUserFavoriteWordHandler } from './application/handlers/remove-user-favorite-word.handler';
import { TodayWordService } from './application/services/today-word.service';
import { SubscriptionModule } from '../subscription/subscription.module';

const commandHandlers = [
  SetUserWordProgressHandler,
  SubmitWordReviewHandler,
  RescheduleWordReviewHandler,
  AddUserFavoriteWordHandler,
  RemoveUserFavoriteWordHandler,
];
const queryHandlers = [
  GetTodayWordForUserHandler,
  GetUserWordProgressHandler,
  GetRandomWordHandler,
  GetReviewQueueHandler,
  GetLearningDashboardHandler,
  GetUserWordLibraryHandler,
  GetUserActivityHandler,
  GetLearnerXpHandler,
  GetUserBadgesHandler,
  GetWordQuizHandler,
  SubmitQuizResultHandler,
  GetUserActivityDetailHandler,
  GetUserFavoriteWordsHandler,
];

const services = [TodayWordService, BadgeAwarderService];

@Module({
  imports: [
    VocabularyModule,
    SubscriptionModule,
    UserLearningModule,
    CqrsModule,
  ],
  controllers: [LearningController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    {
      provide: LEARNING_REPOSITORY,
      useClass: PrismaLearningRepository,
    },
    {
      provide: QUIZ_REPOSITORY,
      useClass: PrismaQuizRepository,
    },
    ...services,
  ],
  // The notifications worker assigns the day's word before announcing it.
  exports: [TodayWordService],
})
export class LearningModule {}
