import { BadgeCode } from '../entities/badge';
import { BadgeCode as PrismaBadgeCode } from '../../../../../generated/prisma/enums';
import {
  BADGE_RULES,
  BadgeSnapshot,
  badgeProgress,
  badgeStandings,
  earnedBadgeCodes,
} from './badge-catalog';

const nothing: BadgeSnapshot = {
  longestStreak: 0,
  wordsCollected: 0,
  themesExplored: 0,
  wordsNearMastery: 0,
};

describe('earnedBadgeCodes', () => {
  it('awards nothing to a fresh account', () => {
    expect(earnedBadgeCodes(nothing)).toEqual([]);
  });

  it('awards a badge on the exact target, not one past it', () => {
    expect(earnedBadgeCodes({ ...nothing, longestStreak: 29 })).toEqual([]);
    expect(earnedBadgeCodes({ ...nothing, longestStreak: 30 })).toEqual([
      BadgeCode.STREAK_30,
    ]);
  });

  it('awards every badge a figure clears, not only the highest', () => {
    // Someone who arrives at 150 days without the app ever running keeps
    // all three: a badge is a record of passing, not of standing.
    expect(earnedBadgeCodes({ ...nothing, longestStreak: 150 })).toEqual([
      BadgeCode.STREAK_30,
      BadgeCode.STREAK_50,
      BadgeCode.STREAK_150,
    ]);
  });

  it('reads each family from its own figure', () => {
    const earned = earnedBadgeCodes({
      longestStreak: 0,
      wordsCollected: 100,
      themesExplored: 5,
      wordsNearMastery: 0,
    });

    expect(earned).toEqual([
      BadgeCode.COLLECTOR_50,
      BadgeCode.COLLECTOR_100,
      BadgeCode.WORD_EXPLORER,
    ]);
  });

  it('leaves the two blocked badges unreachable', () => {
    const everything: BadgeSnapshot = {
      longestStreak: 99999,
      wordsCollected: 99999,
      themesExplored: 99999,
      wordsNearMastery: 99999,
    };

    // They need a second learning profile and the quiz. Absent from the
    // catalogue means locked, not broken.
    expect(earnedBadgeCodes(everything)).not.toContain(BadgeCode.BILINGUAL_PRO);
    expect(earnedBadgeCodes(everything)).not.toContain(BadgeCode.QUIZ_CHAMPION);
  });
});

describe('badgeProgress', () => {
  it('measures against the figure the badge is won on', () => {
    expect(
      badgeProgress(BadgeCode.STREAK_200, { ...nothing, longestStreak: 150 }),
    ).toEqual({ have: 150, need: 200 });
  });

  it('caps at the target rather than overshooting', () => {
    // A bar past full reads as a bug, and 400/365 is not information.
    expect(
      badgeProgress(BadgeCode.HABIT_MASTER, { ...nothing, longestStreak: 400 }),
    ).toEqual({ have: 365, need: 365 });
  });

  it('has nothing to say about a badge outside the catalogue', () => {
    expect(badgeProgress(BadgeCode.QUIZ_CHAMPION, nothing)).toBeNull();
  });
});

describe('the catalogue itself', () => {
  it('names each badge once', () => {
    const codes = BADGE_RULES.map((rule) => rule.code);

    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('the domain enum and the column', () => {
  it('name the same badges', () => {
    // The mapper is an index lookup rather than a switch, so nothing
    // fails to compile when the two drift apart. This is what catches
    // a value added to the schema and forgotten in the domain.
    expect(Object.keys(BadgeCode).sort()).toEqual(
      Object.keys(PrismaBadgeCode).sort(),
    );
  });
});

describe('badgeStandings', () => {
  const snapshot: BadgeSnapshot = { ...nothing, longestStreak: 40 };

  it('lists every badge the app can draw, not only the earned ones', () => {
    // Driven by the catalogue: driving it from the rows would leave a
    // fresh account with an empty screen instead of thirteen goals.
    const standings = badgeStandings({ earned: [], snapshot: nothing });

    expect(standings).toHaveLength(Object.values(BadgeCode).length);
    expect(standings.every((s) => s.earnedAt === null)).toBe(true);
  });

  it('pairs each code with its own date and its own progress', () => {
    const earnedAt = new Date('2026-05-12T09:00:00Z');
    const standings = badgeStandings({
      earned: [{ code: BadgeCode.STREAK_30, earnedAt }],
      snapshot,
    });

    const won = standings.find((s) => s.code === BadgeCode.STREAK_30)!;
    const locked = standings.find((s) => s.code === BadgeCode.STREAK_50)!;

    expect(won.earnedAt).toEqual(earnedAt);
    expect(won.progress).toBeNull();
    expect(locked.earnedAt).toBeNull();
    expect(locked.progress).toEqual({ have: 40, need: 50 });
  });

  it('has nothing to measure on a badge with no rule yet', () => {
    const standings = badgeStandings({ earned: [], snapshot: nothing });

    expect(
      standings.find((s) => s.code === BadgeCode.QUIZ_CHAMPION)!.progress,
    ).toBeNull();
  });

  it('orders held first, then whatever is closest to falling', () => {
    const standings = badgeStandings({
      earned: [{ code: BadgeCode.STREAK_30, earnedAt: new Date() }],
      snapshot,
    });

    expect(standings[0].code).toBe(BadgeCode.STREAK_30);
    // 40/50 beats every collector sitting at zero.
    expect(standings[1].code).toBe(BadgeCode.STREAK_50);
    // The ruleless pair sinks: there is nothing to rank them on.
    expect(standings.at(-1)!.progress).toBeNull();
    expect(standings.at(-1)!.earnedAt).toBeNull();
  });
});
