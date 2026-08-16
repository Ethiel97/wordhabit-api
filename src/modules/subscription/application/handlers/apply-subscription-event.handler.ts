import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import {
  ApplySubscriptionEventCommand,
  ApplySubscriptionEventResult,
} from '../commands/apply-subscription-event.command';
import type { SubscriptionRepository } from '../../domain/repositories/subscription.repository';
import { SUBSCRIPTION_REPOSITORY } from '../../domain/repositories/subscription.repository';
import { toSubscriptionState } from '../../domain/services/revenue-cat-event';

@CommandHandler(ApplySubscriptionEventCommand)
export class ApplySubscriptionEventHandler implements ICommandHandler<
  ApplySubscriptionEventCommand,
  ApplySubscriptionEventResult
> {
  private readonly logger = new Logger(ApplySubscriptionEventHandler.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async execute(
    command: ApplySubscriptionEventCommand,
  ): Promise<ApplySubscriptionEventResult> {
    const userId = command.event.app_user_id;

    // The SDK was never told who this is. Retrying will not make a user
    // appear; see the identify() call the client makes on sign-in.
    if (!userId) {
      this.logger.warn(
        `Webhook ${command.event.type} carried no app_user_id; ignored.`,
      );
      return { applied: false };
    }

    const state = toSubscriptionState(command.event);

    // Writing anything here would revoke: the payload lists none.
    if (state === null) return { applied: false };

    // The event's own instant, not arrival time: a delivery retried for
    // an hour must not look newer than what replaced it meanwhile.
    const eventAt =
      typeof command.event.event_timestamp_ms === 'number'
        ? new Date(command.event.event_timestamp_ms)
        : undefined;

    const applied = await this.subscriptionRepository.applyState({
      userId,
      state,
      eventAt,
    });

    // Also false when the guard refused an out-of-order event, which is
    // a correct outcome rather than a miss.
    if (!applied) {
      this.logger.warn(
        `Webhook ${command.event.type} for ${userId} changed nothing: ` +
          'unknown user, or older than the state on file.',
      );
    }

    return { applied };
  }
}
