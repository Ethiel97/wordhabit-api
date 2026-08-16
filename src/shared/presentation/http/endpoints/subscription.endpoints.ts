export const SUBSCRIPTION = {
  BASE: 'subscription',
  /** RevenueCat calls this one. Public route, header-authenticated. */
  REVENUECAT_WEBHOOK: 'webhooks/revenuecat',
  SYNC: 'sync',
  ME: 'me',
} as const;
