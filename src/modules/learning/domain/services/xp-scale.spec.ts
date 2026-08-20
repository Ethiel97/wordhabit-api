import {
  XP_PACE_WINDOW_DAYS,
  XP_PER_BADGE,
  XP_PER_DAILY_JOURNEY,
  XP_PER_FLASHCARD_RECALL,
  dailyPace,
  xpForBadges,
  xpForJourneys,
  xpForRecalls,
} from './xp-scale';

describe('xpForRecalls', () => {
  it('pays the flashcard rate the app advertises', () => {
    // Read from the constant, not retyped: the app quotes the same one,
    // and a test pinning a literal would keep passing while the two
    // sides drifted apart.
    expect(xpForRecalls(0)).toBe(0);
    expect(xpForRecalls(10)).toBe(10 * XP_PER_FLASHCARD_RECALL);
  });
});

describe('dailyPace', () => {
  it('averages over the window rather than over active days', () => {
    // Four sessions in a week is a pace of four sevenths, not of four:
    // the number answers "how much a day", including the quiet ones.
    expect(dailyPace(70)).toBe(Math.round(70 / XP_PACE_WINDOW_DAYS));
  });

  it('is zero for a week with nothing in it', () => {
    // The app reads this as "no pace to project from" and says nothing,
    // rather than promising a date it cannot support.
    expect(dailyPace(0)).toBe(0);
  });
});

describe('xpForJourneys', () => {
  it('pays the rate the app advertises, once per day', () => {
    expect(xpForJourneys(0)).toBe(0);
    expect(xpForJourneys(30)).toBe(30 * XP_PER_DAILY_JOURNEY);
  });
});

describe('xpForBadges', () => {
  it('pays the rate the app advertises, once per badge', () => {
    expect(xpForBadges(0)).toBe(0);
    expect(xpForBadges(3)).toBe(3 * XP_PER_BADGE);
  });
});
