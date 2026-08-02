import { findDueSlots } from './daily-word-schedule';
import { NotificationSlot } from './entities/notification';

describe('findDueSlots', () => {
  it('fires the morning slot for a zone whose local time just passed 7:30', () => {
    // 06:30 UTC is 07:30 in Paris (CEST, +2).
    const due = findDueSlots(new Date('2026-07-31T05:30:00Z'), [
      'Europe/Paris',
    ]);

    expect(due).toEqual([
      {
        timeZone: 'Europe/Paris',
        slot: NotificationSlot.MORNING,
        localDate: '2026-07-31',
      },
    ]);
  });

  it('still fires when the sweep starts late inside the window', () => {
    const due = findDueSlots(new Date('2026-07-31T05:59:00Z'), [
      'Europe/Paris',
    ]);

    expect(due).toHaveLength(1);
  });

  it('does not fire once the window has closed', () => {
    const due = findDueSlots(new Date('2026-07-31T06:00:00Z'), [
      'Europe/Paris',
    ]);

    expect(due).toEqual([]);
  });

  it('follows DST rather than a fixed offset', () => {
    // In January Paris is CET (+1), so 07:30 local is 06:30 UTC.
    const winter = findDueSlots(new Date('2026-01-15T06:30:00Z'), [
      'Europe/Paris',
    ]);
    const summerOffset = findDueSlots(new Date('2026-01-15T05:30:00Z'), [
      'Europe/Paris',
    ]);

    expect(winter).toHaveLength(1);
    expect(summerOffset).toEqual([]);
  });

  it('handles a half-hour offset zone', () => {
    // Kolkata is +05:30, so 07:30 local is 02:00 UTC.
    const due = findDueSlots(new Date('2026-07-31T02:00:00Z'), [
      'Asia/Kolkata',
    ]);

    expect(due).toEqual([
      {
        timeZone: 'Asia/Kolkata',
        slot: NotificationSlot.MORNING,
        localDate: '2026-07-31',
      },
    ]);
  });

  it('reports the local date, not the UTC one, across midnight', () => {
    // 21:00 in Los Angeles (PDT, -7) on July 31 is 04:00 UTC on August 1.
    // The ledger must key on the recipient's day, or a user west of UTC
    // would be marked as served for tomorrow.
    const due = findDueSlots(new Date('2026-08-01T04:00:00Z'), [
      'America/Los_Angeles',
    ]);

    expect(due).toEqual([
      {
        timeZone: 'America/Los_Angeles',
        slot: NotificationSlot.EVENING,
        localDate: '2026-07-31',
      },
    ]);
  });

  it('skips a timezone the runtime does not know', () => {
    const due = findDueSlots(new Date('2026-07-31T05:30:00Z'), [
      'Mars/Olympus_Mons',
      'Europe/Paris',
    ]);

    expect(due).toHaveLength(1);
  });
});
