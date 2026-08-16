import { SubscriptionState } from '../entities/subscription';

export const SUBSCRIPTION_REPOSITORY = Symbol('SUBSCRIPTION_REPOSITORY');

export interface SubscriptionRepository {
  /**
   * Writes the entitlement the store reported. Returns false when the
   * user id is unknown, which happens legitimately: a webhook can arrive
   * for an account deleted seconds earlier, and that is not an error to
   * retry.
   */
  applyState(params: {
    userId: string;
    state: SubscriptionState;
    /**
     * When the store event happened. An event older than the one already
     * applied is ignored — see the column's own comment.
     */
    eventAt?: Date;
  }): Promise<boolean>;

  findState(userId: string): Promise<SubscriptionState | null>;
}
