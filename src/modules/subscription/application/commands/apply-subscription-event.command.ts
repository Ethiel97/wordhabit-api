import { Command } from '@nestjs/cqrs';
import { RevenueCatEvent } from '../../domain/services/revenue-cat-event';

export type ApplySubscriptionEventResult = {
  /** False when the event named a user this server does not know. */
  applied: boolean;
};

export class ApplySubscriptionEventCommand extends Command<ApplySubscriptionEventResult> {
  constructor(public readonly event: RevenueCatEvent) {
    super();
  }
}
