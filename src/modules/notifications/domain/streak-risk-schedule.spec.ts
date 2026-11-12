import { findDueStreakRiskZones } from './streak-risk-schedule';

describe('findDueStreakRiskZones', () => {
  it('fires at 19:30 local time', () => {
    // Lomé is UTC+0 all year.
    const due = findDueStreakRiskZones(new Date('2026-08-11T19:30:00Z'), [
      'Africa/Lome',
    ]);

    expect(due).toEqual([
      {
        timeZone: 'Africa/Lome',
        localDate: '2026-08-11',
        yesterday: '2026-08-10',
      },
    ]);
  });

  it('still fires late inside the window, and not once it has closed', () => {
    const late = findDueStreakRiskZones(new Date('2026-08-11T19:59:00Z'), [
      'Africa/Lome',
    ]);
    const closed = findDueStreakRiskZones(new Date('2026-08-11T20:00:00Z'), [
      'Africa/Lome',
    ]);

    expect(late).toHaveLength(1);
    expect(closed).toEqual([]);
  });

  it('keys on the local day east of UTC', () => {
    // 19:30 in Tongatapu (+13) on August 12 is 06:30 UTC the same day.
    const due = findDueStreakRiskZones(new Date('2026-08-12T06:30:00Z'), [
      'Pacific/Tongatapu',
    ]);

    expect(due).toEqual([
      {
        timeZone: 'Pacific/Tongatapu',
        localDate: '2026-08-12',
        yesterday: '2026-08-11',
      },
    ]);
  });

  it('keys on the local day west of UTC', () => {
    // 19:30 in Los Angeles (PDT, -7) on July 31 is 02:30 UTC on August 1.
    const due = findDueStreakRiskZones(new Date('2026-08-01T02:30:00Z'), [
      'America/Los_Angeles',
    ]);

    expect(due[0]).toMatchObject({
      localDate: '2026-07-31',
      yesterday: '2026-07-30',
    });
  });

  it('finds yesterday across a month end, a year end and a DST change', () => {
    const at = (iso: string) =>
      findDueStreakRiskZones(new Date(iso), ['Europe/Paris'])[0];

    // Paris is +2 in summer, +1 in winter.
    expect(at('2026-09-01T17:30:00Z').yesterday).toBe('2026-08-31');
    expect(at('2027-01-01T18:30:00Z').yesterday).toBe('2026-12-31');
    // Clocks went forward overnight on March 29, 2026.
    expect(at('2026-03-29T17:30:00Z').yesterday).toBe('2026-03-28');
  });

  it('skips a timezone the runtime does not know', () => {
    const due = findDueStreakRiskZones(new Date('2026-08-11T19:30:00Z'), [
      'Mars/Olympus_Mons',
      'Africa/Lome',
    ]);

    expect(due).toHaveLength(1);
  });
});
