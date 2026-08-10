import { Inject, Injectable } from '@nestjs/common';
import {
  FREE_SUBSCRIPTION,
  SubscriptionState,
  SubscriptionTier,
} from '../../domain/entities/subscription';
import type { SubscriptionRepository } from '../../domain/repositories/subscription.repository';
import { SUBSCRIPTION_REPOSITORY } from '../../domain/repositories/subscription.repository';

/**
 * The server's answer to "may this user reach a Pro capability". A
 * service rather than a query: a guard on a hot route should not go
 * through the bus for a single boolean.
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
   * Re-checks the expiry rather than trusting the tier alone. Webhooks
   * are lost, delayed and replayed out of order, so a row left at PRO
   * with a past expiry is normal rather than corruption, and reading the
   * date closes that window without a job to sweep it.
   */
  async isPro(userId: string, now: Date = new Date()): Promise<boolean> {
    const state = await this.stateFor(userId);
    if (state.tier !== SubscriptionTier.PRO) return false;
    if (state.expiresAt === null) return true;
    return state.expiresAt.getTime() > now.getTime();
  }
}
