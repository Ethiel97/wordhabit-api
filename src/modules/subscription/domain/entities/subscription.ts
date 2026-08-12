export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
}

/**
 * [expiresAt] is kept even on a cancelled PRO subscription: the
 * entitlement runs to the end of the paid period, and "is Pro" and
 * "will still be Pro tomorrow" are different questions.
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
