import { SubscriptionTier } from '../../domain/entities/subscription';
import { SubscriptionService } from './subscription.service';

const now = new Date('2026-08-10T12:00:00.000Z');

function makeService(
  state: {
    tier: SubscriptionTier;
    expiresAt: Date | null;
  } | null,
) {
  const repo = {
    findState: jest
      .fn()
      .mockResolvedValue(
        state === null ? null : { ...state, store: 'APP_STORE' },
      ),
    applyState: jest.fn().mockResolvedValue(true),
  };
  return new SubscriptionService(repo);
}

describe('SubscriptionService.isPro', () => {
  it('says no for a user the table does not know', async () => {
    const service = makeService(null);

    await expect(service.isPro('ghost', now)).resolves.toBe(false);
  });

  it('says yes while the period is running', async () => {
    const service = makeService({
      tier: SubscriptionTier.PRO,
      expiresAt: new Date('2026-08-11T12:00:00.000Z'),
    });

    await expect(service.isPro('user-1', now)).resolves.toBe(true);
  });

  it('says no once the period is behind us, even though the row still reads PRO', async () => {
    // The webhook is the only writer, and webhooks are lost, delayed and
    // replayed out of order. A stale PRO row is normal, and reading the
    // date closes that window without a job sweeping the table.
    const service = makeService({
      tier: SubscriptionTier.PRO,
      expiresAt: new Date('2026-08-09T12:00:00.000Z'),
    });

    await expect(service.isPro('user-1', now)).resolves.toBe(false);
  });

  it('says yes with no expiry at all', async () => {
    const service = makeService({
      tier: SubscriptionTier.PRO,
      expiresAt: null,
    });

    await expect(service.isPro('user-1', now)).resolves.toBe(true);
  });

  it('says no for a free user whatever the dates say', async () => {
    const service = makeService({
      tier: SubscriptionTier.FREE,
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
    });

    await expect(service.isPro('user-1', now)).resolves.toBe(false);
  });
});
