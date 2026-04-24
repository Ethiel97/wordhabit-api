import { Module } from '@nestjs/common';
import { UserLearningController } from './presentation/http/user-learning.controller';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaUserLearningRepository } from './infrastructure/persistence/prisma-user-learning.repository';
import { USER_LEARNING_REPOSITORY } from './domain/repositories/user-learning.repository';
import { OnboardingController } from './presentation/http/onboarding.controller';
import { CreateUserLearningProfileHandler } from './application/handlers/create-user-learning-profile.handler';

const commandHandlers = [CreateUserLearningProfileHandler];
const queryHandlers = [];

@Module({
  imports: [CqrsModule],
  controllers: [OnboardingController, UserLearningController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,

    PrismaUserLearningRepository,
    {
      provide: USER_LEARNING_REPOSITORY,
      useClass: PrismaUserLearningRepository,
    },
  ],
})
export class UserLearningModule {}
