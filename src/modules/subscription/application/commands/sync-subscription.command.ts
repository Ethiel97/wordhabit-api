import { Command } from '@nestjs/cqrs';
import { SubscriptionState } from '../../domain/entities/subscription';

export type SyncSubscriptionResult = SubscriptionState;

export class SyncSubscriptionCommand extends Command<SyncSubscriptionResult> {
  constructor(public readonly userId: string) {
    super();
  }
}
