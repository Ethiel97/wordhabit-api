import { BadgeCode } from '../../domain/entities/badge';
import { BadgeSnapshot } from '../../domain/services/badge-catalog';
import { GetUserBadgesHandler } from './get-user-badges.handler';
import { GetUserBadgesQuery } from '../queries/get-user-badges.query';

const snapshot: BadgeSnapshot = {
  longestStreak: 40,
  wordsCollected: 0,
  themesExplored: 0,
  wordsNearMastery: 0,
  quizPerfectModes: 0,
};

function makeHandler(earnedNow: BadgeCode[]) {
  const awarded: string[] = [];
  const rows = earnedNow.map((code) => ({ code, earnedAt: new Date() }));

  const repository = {
    // Read *after* awarding, so it must reflect whatever was inserted.
    findUserBadges: () => Promise.resolve(rows),
  };
  const awarder = {
    // The snapshot comes through the awarder since the repository
    // split: it composes the learning figures with the quiz's.
    readSnapshot: () => Promise.resolve(snapshot),
    awardQuietly: (userId: string) => {
      awarded.push(userId);
      return Promise.resolve([]);
    },
  };

  return {
    awarded,
    handler: new GetUserBadgesHandler(repository as never, awarder as never),
  };
}

describe('GetUserBadgesHandler', () => {
  it('awards what is due before reading, so a full bar is never locked', async () => {
    // The write paths are the usual moment badges land. Anything that
    // became true in between would otherwise sit here at 100%, locked.
    const { handler, awarded } = makeHandler([]);

    await handler.execute(new GetUserBadgesQuery('u1'));

    expect(awarded).toEqual(['u1']);
  });

  it('hands both reads to the domain and returns them whole', async () => {
    const { handler } = makeHandler([BadgeCode.STREAK_30]);

    const { badges } = await handler.execute(new GetUserBadgesQuery('u1'));

    // What each badge says is the domain's business, tested there.
    expect(badges).toHaveLength(Object.values(BadgeCode).length);
    expect(badges[0].code).toBe(BadgeCode.STREAK_30);
  });
});
