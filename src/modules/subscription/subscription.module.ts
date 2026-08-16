import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionController } from './presentation/http/subscription.controller';
import { ApplySubscriptionEventHandler } from './application/handlers/apply-subscription-event.handler';
import { SubscriptionService } from './application/services/subscription.service';
import { RequiresProGuard } from './presentation/requires-pro.guard';
import { RevenueCatAuthGuard } from './infrastructure/webhook/revenue-cat-auth.guard';
import { SyncSubscriptionHandler } from './application/handlers/sync-subscription.handler';
import { SUBSCRIBER_SOURCE } from './domain/ports/subscriber-source.port';
import { RevenueCatSubscriberSource } from './infrastructure/revenue-cat/revenue-cat-subscriber.source';
import { PrismaSubscriptionRepository } from './infrastructure/persistence/prisma-subscription.repository';
import { SUBSCRIPTION_REPOSITORY } from './domain/repositories/subscription.repository';

const commandHandlers = [
  ApplySubscriptionEventHandler,
  SyncSubscriptionHandler,
];

@Module({
  imports: [CqrsModule, ConfigModule],
  controllers: [SubscriptionController],
  providers: [
    ...commandHandlers,
    SubscriptionService,
    RequiresProGuard,
    RevenueCatAuthGuard,
    PrismaSubscriptionRepository,
    RevenueCatSubscriberSource,
    {
      provide: SUBSCRIPTION_REPOSITORY,
      useExisting: PrismaSubscriptionRepository,
    },
    {
      provide: SUBSCRIBER_SOURCE,
      useExisting: RevenueCatSubscriberSource,
    },
  ],
  // Both are exported so any module can gate a route on Pro without
  // reaching into this one's internals.
  exports: [SubscriptionService, RequiresProGuard],
})
export class SubscriptionModule {}
