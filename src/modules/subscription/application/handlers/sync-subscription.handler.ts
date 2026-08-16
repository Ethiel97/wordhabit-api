import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import {
  SyncSubscriptionCommand,
  SyncSubscriptionResult,
} from '../commands/sync-subscription.command';
import type { SubscriptionRepository } from '../../domain/repositories/subscription.repository';
import { SUBSCRIPTION_REPOSITORY } from '../../domain/repositories/subscription.repository';
import type { SubscriberSource } from '../../domain/ports/subscriber-source.port';
import { SUBSCRIBER_SOURCE } from '../../domain/ports/subscriber-source.port';
import { SubscriptionService } from '../services/subscription.service';

/**
 * Re-reads the entitlement from the store and writes what it finds.
 *
 * The webhook is a single message that can be lost — a bad secret, a
 * rejected payload, an outage — and nothing downstream notices: the app
 * shows a Pro badge from its own SDK while the server keeps refusing Pro
 * features. This is the client's way of asking the server to look again.
 */
@CommandHandler(SyncSubscriptionCommand)
export class SyncSubscriptionHandler implements ICommandHandler<
  SyncSubscriptionCommand,
  SyncSubscriptionResult
> {
  private readonly logger = new Logger(SyncSubscriptionHandler.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: SubscriptionRepository,
    @Inject(SUBSCRIBER_SOURCE)
    private readonly subscribers: SubscriberSource,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async execute(
    command: SyncSubscriptionCommand,
  ): Promise<SyncSubscriptionResult> {
    const state = await this.subscribers.read(command.userId);

    // Unreadable, not "free": a store outage must not revoke a paying
    // learner. The state on file stands until the store answers.
    if (state === null) {
      return this.subscriptionService.stateFor(command.userId);
    }

    const applied = await this.subscriptionRepository.applyState({
      userId: command.userId,
      state,
    });

    if (!applied) {
      this.logger.warn(`Sync named unknown user ${command.userId}.`);
    }

    return state;
  }
}
