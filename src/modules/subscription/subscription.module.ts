import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionController } from './presentation/http/subscription.controller';
import { ApplySubscriptionEventHandler } from './application/handlers/apply-subscription-event.handler';
import { SubscriptionService } from './application/services/subscription.service';
import { RequiresProGuard } from './presentation/requires-pro.guard';
import { RevenueCatAuthGuard } from './infrastructure/webhook/revenue-cat-auth.guard';
import { PrismaSubscriptionRepository } from './infrastructure/persistence/prisma-subscription.repository';
import { SUBSCRIPTION_REPOSITORY } from './domain/repositories/subscription.repository';

const commandHandlers = [ApplySubscriptionEventHandler];

@Module({
  imports: [CqrsModule, ConfigModule],
  controllers: [SubscriptionController],
  providers: [
    ...commandHandlers,
    SubscriptionService,
    RequiresProGuard,
    RevenueCatAuthGuard,
    PrismaSubscriptionRepository,
    {
      provide: SUBSCRIPTION_REPOSITORY,
      useExisting: PrismaSubscriptionRepository,
    },
  ],
  // Both are exported so any module can gate a route on Pro without
  // reaching into this one's internals.
  exports: [SubscriptionService, RequiresProGuard],
})
export class SubscriptionModule {}
