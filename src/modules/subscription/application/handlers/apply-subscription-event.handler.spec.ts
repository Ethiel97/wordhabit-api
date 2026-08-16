import { ApplySubscriptionEventHandler } from './apply-subscription-event.handler';
import { ApplySubscriptionEventCommand } from '../commands/apply-subscription-event.command';
import { SubscriptionRepository } from '../../domain/repositories/subscription.repository';
import { SubscriptionTier } from '../../domain/entities/subscription';

/**
 * Applies in arrival order but refuses to go backwards, the way the
 * partial `where` clause does in Postgres.
 */
class InMemorySubscriptionRepository implements SubscriptionRepository {
  tier = SubscriptionTier.FREE;
  eventAt: Date | null = null;

  applyState(params: {
    userId: string;
    state: {
      tier: SubscriptionTier;
      expiresAt: Date | null;
      store: string | null;
    };
    eventAt?: Date;
  }): Promise<boolean> {
    if (
      params.eventAt &&
      this.eventAt &&
      params.eventAt.getTime() < this.eventAt.getTime()
    ) {
      return Promise.resolve(false);
    }
    this.tier = params.state.tier;
    if (params.eventAt) this.eventAt = params.eventAt;
    return Promise.resolve(true);
  }

  findState() {
    return Promise.resolve({
      tier: this.tier,
      expiresAt: null,
      store: null,
    });
  }
}

const USER = 'u1';
const FAR_FUTURE = new Date('2226-06-28').getTime();

function grant(atMs: number) {
  return new ApplySubscriptionEventCommand({
    type: 'NON_RENEWING_PURCHASE',
    app_user_id: USER,
    entitlement_ids: ['pro'],
    expiration_at_ms: FAR_FUTURE,
    event_timestamp_ms: atMs,
  });
}

function cancellation(atMs: number) {
  return new ApplySubscriptionEventCommand({
    type: 'CANCELLATION',
    app_user_id: USER,
    entitlement_ids: ['pro'],
    // Already past: the entitlement is gone, not merely not renewing.
    expiration_at_ms: atMs - 1000,
    event_timestamp_ms: atMs,
  });
}

describe('ApplySubscriptionEventHandler ordering', () => {
  let repository: InMemorySubscriptionRepository;
  let handler: ApplySubscriptionEventHandler;

  beforeEach(() => {
    repository = new InMemorySubscriptionRepository();
    handler = new ApplySubscriptionEventHandler(repository);
  });

  it('keeps the newer grant when a stale cancellation is retried after it', async () => {
    const cancelledAt = 1_786_766_161_411;
    const grantedAt = cancelledAt + 60_000;

    await handler.execute(grant(grantedAt));
    const late = await handler.execute(cancellation(cancelledAt));

    expect(late).toEqual({ applied: false });
    expect(repository.tier).toBe(SubscriptionTier.PRO);
  });

  it('still applies a cancellation that really is the latest word', async () => {
    const grantedAt = 1_786_766_161_411;

    await handler.execute(grant(grantedAt));
    await handler.execute(cancellation(grantedAt + 60_000));

    expect(repository.tier).toBe(SubscriptionTier.FREE);
  });
});
