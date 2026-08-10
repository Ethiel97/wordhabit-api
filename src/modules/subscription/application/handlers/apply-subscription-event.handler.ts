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

    // An anonymous id means the SDK was never told who this is. Nothing
    // to write, and retrying will not make a user appear — see the
    // identify() call the client makes on sign-in.
    if (!userId) {
      this.logger.warn(
        `Webhook ${command.event.type} carried no app_user_id; ignored.`,
      );
      return { applied: false };
    }

    const state = toSubscriptionState(command.event);
    const applied = await this.subscriptionRepository.applyState({
      userId,
      state,
    });

    if (!applied) {
      this.logger.warn(
        `Webhook ${command.event.type} named unknown user ${userId}.`,
      );
    }

    return { applied };
  }
}
