import { Logger } from '@nestjs/common';
import { BadgeCode } from '../../domain/entities/badge';
import {
  BadgeSnapshot,
  MASTERED_WORDS_PER_BILINGUAL_LANGUAGE,
  PERFECT_DAYS_PER_QUIZ_MODE,
} from '../../domain/services/badge-catalog';
import { BadgeAwarderService } from './badge-awarder.service';

type Repo = {
  findBadgeSnapshot: jest.Mock<Promise<BadgeSnapshot>, [string]>;
  countMasteredWordsByLanguage: jest.Mock<
    Promise<{ language: string; masteredWords: number }[]>,
    []
  >;
  awardBadges: jest.Mock<
    Promise<BadgeCode[]>,
    [{ userId: string; codes: BadgeCode[] }]
  >;
};

const nothing: BadgeSnapshot = {
  longestStreak: 0,
  wordsCollected: 0,
  themesExplored: 0,
  wordsNearMastery: 0,
  quizPerfectModes: 0,
  masteredLanguages: 0,
};

function makeService(snapshot: BadgeSnapshot, held: BadgeCode[] = []) {
  const repo: Repo = {
    findBadgeSnapshot: jest
      .fn<Promise<BadgeSnapshot>, [string]>()
      .mockResolvedValue(snapshot),
    // Handed back at the threshold, so the fixture's language count
    // survives the composition.
    countMasteredWordsByLanguage: jest.fn(() =>
      Promise.resolve(
        Array.from({ length: snapshot.masteredLanguages }, (_, index) => ({
          language: `LANG_${index}`,
          masteredWords: MASTERED_WORDS_PER_BILINGUAL_LANGUAGE,
        })),
      ),
    ),
    awardBadges: jest.fn(({ codes }) =>
      Promise.resolve(codes.filter((code) => !held.includes(code))),
    ),
  };
  return {
    repo,
    service: new BadgeAwarderService(
      repo as never,
      {
        // The quiz side of the snapshot, handed back at the threshold so
        // the fixture's mode count survives the composition.
        findPerfectQuizDaysByMode: () =>
          Promise.resolve(
            Array.from({ length: snapshot.quizPerfectModes }, (_, index) => ({
              mode: `MODE_${index}`,
              perfectDays: PERFECT_DAYS_PER_QUIZ_MODE,
            })),
          ),
      } as never,
    ),
  };
}

describe('BadgeAwarderService', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('offers everything the standing satisfies, not a diff', () => {
    // The unique index decides what is new. Computing the diff here
    // would race two writers into awarding the same badge twice.
    const { repo, service } = makeService({ ...nothing, longestStreak: 60 });

    return service.award('u1').then(() => {
      expect(repo.awardBadges).toHaveBeenCalledWith({
        userId: 'u1',
        codes: [BadgeCode.STREAK_30, BadgeCode.STREAK_50],
      });
    });
  });

  it('returns only what this call won', async () => {
    const { service } = makeService({ ...nothing, longestStreak: 60 }, [
      BadgeCode.STREAK_30,
    ]);

    await expect(service.award('u1')).resolves.toEqual([BadgeCode.STREAK_50]);
  });

  it('is a no-op once everything is held', async () => {
    const { service } = makeService({ ...nothing, longestStreak: 60 }, [
      BadgeCode.STREAK_30,
      BadgeCode.STREAK_50,
    ]);

    await expect(service.award('u1')).resolves.toEqual([]);
  });

  it('never lets a badge failure fail the write it followed', async () => {
    const { service } = makeService(nothing);
    (
      service as never as { badgeRepository: Repo }
    ).badgeRepository.findBadgeSnapshot.mockRejectedValue(new Error('db down'));

    // The review that triggered this already succeeded, and the next
    // write re-evaluates from scratch.
    await expect(service.awardQuietly('u1')).resolves.toEqual([]);
  });
});
