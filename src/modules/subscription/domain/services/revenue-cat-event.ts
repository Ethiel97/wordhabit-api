import {
  FREE_SUBSCRIPTION,
  SubscriptionState,
  SubscriptionTier,
} from '../entities/subscription';

/** The entitlement the app gates on. Everything else is store detail. */
export const PRO_ENTITLEMENT = 'pro';

/**
 * The fields of a RevenueCat webhook this server actually reads. The
 * payload carries a few dozen more; naming only these keeps the parsing
 * honest about what the decision depends on.
 */
export interface RevenueCatEvent {
  type: string;
  app_user_id?: string;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
  store?: string | null;
}

/**
 * Events that revoke access whatever the rest of the payload says.
 * TRANSFER is the subtle one: the subscription moved to another account,
 * so *this* user loses it even though nothing expired.
 */
const REVOKING = new Set(['EXPIRATION', 'TRANSFER', 'SUBSCRIPTION_PAUSED']);

/**
 * Reads the entitlement out of one webhook event.
 *
 * Deliberately not a switch over the twenty-odd event types RevenueCat
 * can send. New types appear, and a switch would fall through silently
 * on one that matters. The question asked instead is the one the app
 * actually cares about: does this payload leave the learner holding the
 * entitlement, and until when. An unknown event type answers it
 * correctly by construction.
 *
 * [now] is injected so a test can pin the boundary rather than race it.
 */
export function toSubscriptionState(
  event: RevenueCatEvent,
  now: Date = new Date(),
): SubscriptionState {
  if (REVOKING.has(event.type)) return FREE_SUBSCRIPTION;

  const holdsEntitlement = (event.entitlement_ids ?? []).includes(
    PRO_ENTITLEMENT,
  );
  if (!holdsEntitlement) return FREE_SUBSCRIPTION;

  const expiresAt =
    typeof event.expiration_at_ms === 'number'
      ? new Date(event.expiration_at_ms)
      : null;

  // A billing issue does not revoke on its own: the store keeps retrying
  // through the grace period, and the expiry it sends already accounts
  // for that. Trusting the date rather than the event type is what makes
  // grace periods work without a line of our own.
  if (expiresAt !== null && expiresAt.getTime() <= now.getTime()) {
    return FREE_SUBSCRIPTION;
  }

  return {
    tier: SubscriptionTier.PRO,
    expiresAt,
    store: event.store ?? null,
  };
}
