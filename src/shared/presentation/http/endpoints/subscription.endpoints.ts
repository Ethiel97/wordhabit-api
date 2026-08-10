export const SUBSCRIPTION = {
  BASE: 'subscription',
  /** RevenueCat calls this one. Public route, header-authenticated. */
  REVENUECAT_WEBHOOK: 'webhooks/revenuecat',
  ME: 'me',
} as const;
