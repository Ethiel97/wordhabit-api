import { SubscriptionTier } from '../entities/subscription';
import { RevenueCatEvent, toSubscriptionState } from './revenue-cat-event';

const now = new Date('2026-08-10T12:00:00.000Z');
const tomorrow = new Date('2026-08-11T12:00:00.000Z').getTime();
const yesterday = new Date('2026-08-09T12:00:00.000Z').getTime();

const event = (overrides: Partial<RevenueCatEvent> = {}): RevenueCatEvent => ({
  type: 'INITIAL_PURCHASE',
  app_user_id: 'user-1',
  entitlement_ids: ['pro'],
  expiration_at_ms: tomorrow,
  store: 'APP_STORE',
  ...overrides,
});

describe('toSubscriptionState', () => {
  it('grants Pro for a live entitlement', () => {
    const state = toSubscriptionState(event(), now);

    expect(state.tier).toBe(SubscriptionTier.PRO);
    expect(state.expiresAt?.getTime()).toBe(tomorrow);
    expect(state.store).toBe('APP_STORE');
  });

  it('keeps Pro through a billing issue, because the store still has time to retry', () => {
    // The grace period lives in the expiry the store sends, not in our
    // reading of the event name. This is the case that would silently
    // cut off a paying customer whose card expired.
    const state = toSubscriptionState(
      event({ type: 'BILLING_ISSUE', expiration_at_ms: tomorrow }),
      now,
    );

    expect(state.tier).toBe(SubscriptionTier.PRO);
  });

  it('revokes once the expiry is behind us, whatever the event says', () => {
    const state = toSubscriptionState(
      event({ type: 'RENEWAL', expiration_at_ms: yesterday }),
      now,
    );

    expect(state.tier).toBe(SubscriptionTier.FREE);
  });

  it('revokes on transfer: the subscription is now someone else’s', () => {
    const state = toSubscriptionState(
      event({ type: 'TRANSFER', expiration_at_ms: tomorrow }),
      now,
    );

    expect(state.tier).toBe(SubscriptionTier.FREE);
  });

  it('revokes on expiration and on pause', () => {
    for (const type of ['EXPIRATION', 'SUBSCRIPTION_PAUSED']) {
      expect(toSubscriptionState(event({ type }), now).tier).toBe(
        SubscriptionTier.FREE,
      );
    }
  });

  it('ignores an entitlement we do not sell', () => {
    const state = toSubscriptionState(
      event({ entitlement_ids: ['legacy_lifetime'] }),
      now,
    );

    expect(state.tier).toBe(SubscriptionTier.FREE);
  });

  it('treats a missing entitlement list as no entitlement', () => {
    expect(
      toSubscriptionState(event({ entitlement_ids: null }), now).tier,
    ).toBe(SubscriptionTier.FREE);
  });

  it('grants Pro without an expiry, which is how lifetime arrives', () => {
    const state = toSubscriptionState(event({ expiration_at_ms: null }), now);

    expect(state.tier).toBe(SubscriptionTier.PRO);
    expect(state.expiresAt).toBeNull();
  });

  it('reads an unknown event type by its payload rather than falling through', () => {
    // The point of not switching on the type: a name invented next year
    // still answers correctly.
    const state = toSubscriptionState(
      event({ type: 'SOME_FUTURE_EVENT' }),
      now,
    );

    expect(state.tier).toBe(SubscriptionTier.PRO);
  });
});
