import { Module } from '@nestjs/common';
import { UserLearningController } from './presentation/http/user-learning.controller';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaUserLearningRepository } from './infrastructure/persistence/prisma-user-learning.repository';
import { USER_LEARNING_REPOSITORY } from './domain/repositories/user-learning.repository';
import { OnboardingController } from './presentation/http/onboarding.controller';
import { CreateUserLearningProfileHandler } from './application/handlers/create-user-learning-profile.handler';
import { UpdateUserLearningProfileHandler } from './application/handlers/update-user-learning-profile.handler';
import { GetActiveUserLearningProfileHandler } from './application/handlers/get-active-user-learning-profile.handler';
import { GetUserLearningProfilesHandler } from './application/handlers/get-user-learning-profiles.handler';
import { ActivateUserLearningProfileHandler } from './application/handlers/activate-user-learning-profile.handler';
import { VocabularyModule } from '../vocabulary/vocabulary.module';
import { EnsureThemesExistService } from './application/services/ensure-themes-exist.service';

const commandHandlers = [
  ActivateUserLearningProfileHandler,
  CreateUserLearningProfileHandler,
  UpdateUserLearningProfileHandler,
];
const queryHandlers = [
  GetActiveUserLearningProfileHandler,
  GetUserLearningProfilesHandler,
];

@Module({
  imports: [CqrsModule, VocabularyModule],
  controllers: [OnboardingController, UserLearningController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    EnsureThemesExistService,

    PrismaUserLearningRepository,
    {
      provide: USER_LEARNING_REPOSITORY,
      useClass: PrismaUserLearningRepository,
    },
  ],
  exports: [USER_LEARNING_REPOSITORY],
})
export class UserLearningModule {}
