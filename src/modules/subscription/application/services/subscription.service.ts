import { Inject, Injectable } from '@nestjs/common';
import {
  FREE_SUBSCRIPTION,
  SubscriptionState,
  SubscriptionTier,
} from '../../domain/entities/subscription';
import type { SubscriptionRepository } from '../../domain/repositories/subscription.repository';
import { SUBSCRIPTION_REPOSITORY } from '../../domain/repositories/subscription.repository';

/**
 * The server's answer to "may this user reach a Pro capability".
 *
 * Exported for other modules to inject, which is why it lives in
 * application rather than behind a query: a guard on a hot route should
 * not go through the bus for a single boolean.
 */
@Injectable()
export class SubscriptionService {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async stateFor(userId: string): Promise<SubscriptionState> {
    return (
      (await this.subscriptionRepository.findState(userId)) ?? FREE_SUBSCRIPTION
    );
  }

  /**
   * Re-checks the expiry rather than trusting the tier alone.
   *
   * The webhook is the only writer, and webhooks are lost, delayed and
   * replayed out of order. A row left at PRO with an expiry in the past
   * is therefore normal, not corruption, and reading the date closes
   * that window without a scheduled job to sweep it.
   */
  async isPro(userId: string, now: Date = new Date()): Promise<boolean> {
    const state = await this.stateFor(userId);
    if (state.tier !== SubscriptionTier.PRO) return false;
    if (state.expiresAt === null) return true;
    return state.expiresAt.getTime() > now.getTime();
  }
}
