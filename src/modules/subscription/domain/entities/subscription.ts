export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
}

/**
 * What the store says about one learner, right now.
 *
 * [expiresAt] is kept even when the tier is PRO and the subscription has
 * been cancelled: the entitlement runs to the end of the paid period,
 * and "is Pro" and "will still be Pro tomorrow" are different questions.
 */
export interface SubscriptionState {
  tier: SubscriptionTier;
  expiresAt: Date | null;
  store: string | null;
}

export const FREE_SUBSCRIPTION: SubscriptionState = {
  tier: SubscriptionTier.FREE,
  expiresAt: null,
  store: null,
};
