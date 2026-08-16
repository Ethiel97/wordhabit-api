import {
  FREE_SUBSCRIPTION,
  SubscriptionState,
  SubscriptionTier,
} from '../entities/subscription';

/** The entitlement the app gates on. Everything else is store detail. */
export const PRO_ENTITLEMENT = 'pro';

/** The fields this server reads; the payload carries a few dozen more. */
export interface RevenueCatEvent {
  type: string;
  app_user_id?: string;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
  store?: string | null;
  event_timestamp_ms?: number | null;
}

/**
 * Revoke whatever the rest of the payload says. TRANSFER is the subtle
 * one: the subscription moved to another account, so this user loses it
 * even though nothing expired.
 */
const REVOKING = new Set(['EXPIRATION', 'TRANSFER', 'SUBSCRIPTION_PAUSED']);

/**
 * Paywall events carry no entitlement_ids, and "no entitlements" read as
 * a subscription event means revoke: a paying learner merely opening the
 * paywall would be downgraded. TEST is the dashboard button.
 */
function saysNothingAboutEntitlements(type: string): boolean {
  return type.startsWith('PAYWALL_') || type === 'TEST';
}

/**
 * The entitlement one event leaves behind, or null when the event is not
 * about entitlements and nothing should be written.
 *
 * Not a switch over the twenty-odd subscription types: new ones appear
 * and a switch would fall through silently. Asking "does this payload
 * leave the learner holding the entitlement, and until when" answers an
 * unknown subscription type correctly by construction.
 *
 * [now] is injected so a test can pin the boundary rather than race it.
 */
export function toSubscriptionState(
  event: RevenueCatEvent,
  now: Date = new Date(),
): SubscriptionState | null {
  if (saysNothingAboutEntitlements(event.type)) return null;

  if (REVOKING.has(event.type)) return FREE_SUBSCRIPTION;

  const holdsEntitlement = (event.entitlement_ids ?? []).includes(
    PRO_ENTITLEMENT,
  );
  if (!holdsEntitlement) return FREE_SUBSCRIPTION;

  const expiresAt =
    typeof event.expiration_at_ms === 'number'
      ? new Date(event.expiration_at_ms)
      : null;

  // A billing issue does not revoke on its own: the store retries
  // through the grace period and the expiry already accounts for it.
  // Trusting the date is what makes grace periods work for free.
  if (expiresAt !== null && expiresAt.getTime() <= now.getTime()) {
    return FREE_SUBSCRIPTION;
  }

  return {
    tier: SubscriptionTier.PRO,
    expiresAt,
    store: event.store ?? null,
  };
}
