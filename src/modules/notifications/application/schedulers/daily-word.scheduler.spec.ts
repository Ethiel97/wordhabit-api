import { toJobId } from './daily-word.scheduler';

describe('toJobId', () => {
  it('never contains a colon', () => {
    // BullMQ rejects one, and the scheduler swallows the rejection: the
    // sweep would just stop running, with nothing marked as failed.
    expect(
      toJobId('daily-word', new Date('2026-08-03T01:30:00.000Z')),
    ).not.toContain(':');
  });

  it('is stable for the same instant', () => {
    // Two API instances ticking together must produce the same id, or
    // BullMQ has nothing to deduplicate and the sweep runs twice.
    const at = new Date('2026-08-03T01:30:00.000Z');

    expect(toJobId('daily-word', at)).toBe(toJobId('daily-word', at));
    expect(toJobId('daily-word', at)).toBe(
      'daily-word-2026-08-03T01-30-00-000Z',
    );
  });

  it('distinguishes consecutive ticks', () => {
    expect(
      toJobId('daily-word', new Date('2026-08-03T01:30:00.000Z')),
    ).not.toBe(toJobId('daily-word', new Date('2026-08-03T02:00:00.000Z')));
  });
});
