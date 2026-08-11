import { TodayWordService } from './today-word.service';
import { CandidateWordNotFoundError } from '../errors/candidate-word-not-found.error';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import type { UserLearningRepository } from '../../../user-learning/domain/repositories/user-learning.repository';
import { UserLearningProfileNotFoundError } from '../../../user-learning/application/errors/user-learning-profile-errors';

const profile = (id: string) => ({ id, userId: 'u1' }) as never;

function build(overrides: {
  activeProfile?: unknown;
  existingAssignment?: unknown;
  candidate?: unknown;
}) {
  const findTodayAssignment = jest
    .fn<Promise<unknown>, [Record<string, unknown>]>()
    .mockResolvedValue(overrides.existingAssignment ?? null);
  const createDailyAssignment = jest
    .fn<Promise<unknown>, [Record<string, unknown>]>()
    .mockImplementation((params) => Promise.resolve(params));

  // `in` rather than `??`: these overrides are meaningful when null, and
  // a nullish default would quietly hand the tests a working profile.
  const candidate =
    'candidate' in overrides ? overrides.candidate : { id: 'w1' };
  const active =
    'activeProfile' in overrides ? overrides.activeProfile : profile('p-en');

  const learning = {
    findTodayAssignment,
    createDailyAssignment,
    findCandidateWord: jest.fn().mockResolvedValue(candidate),
  } as unknown as LearningRepository;

  const userLearning = {
    findActiveUserLearningProfile: jest.fn().mockResolvedValue(active),
  } as unknown as UserLearningRepository;

  return {
    service: new TodayWordService(userLearning, learning),
    findTodayAssignment,
    createDailyAssignment,
  };
}

describe('TodayWordService', () => {
  it('looks the assignment up by profile, never by user', async () => {
    // The whole multi-profile feature rests on this: a learner with two
    // languages has two assignments for the same day, and a lookup keyed
    // on the user hands back whichever was written first.
    const { service, findTodayAssignment } = build({
      activeProfile: profile('p-fr'),
    });

    await service.getOrAssignTodayWord('u1', '2026-08-10');

    expect(findTodayAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ userLearningProfileId: 'p-fr' }),
    );
    expect(findTodayAssignment.mock.calls[0][0]).not.toHaveProperty('userId');
  });

  it('gives two profiles two different words on the same day', async () => {
    const day = '2026-08-10';
    const assigned: Record<string, unknown> = {};

    for (const [id, word] of [
      ['p-en', 'w-en'],
      ['p-fr', 'w-fr'],
    ]) {
      const { service, createDailyAssignment } = build({
        activeProfile: profile(id),
        candidate: { id: word },
      });
      await service.getOrAssignTodayWord('u1', day);
      assigned[id] = createDailyAssignment.mock.calls[0][0];
    }

    expect(assigned['p-en']).toMatchObject({
      userLearningProfileId: 'p-en',
      wordId: 'w-en',
    });
    expect(assigned['p-fr']).toMatchObject({
      userLearningProfileId: 'p-fr',
      wordId: 'w-fr',
    });
  });

  it('serves a named profile without consulting the active one', async () => {
    // The notification sweep announces a named profile's word; resolving
    // the active one there would announce whichever language the learner
    // last opened.
    const { service, findTodayAssignment } = build({
      activeProfile: profile('p-en'),
    });

    await service.getOrAssignForProfile(profile('p-es'), '2026-08-10');

    expect(findTodayAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ userLearningProfileId: 'p-es' }),
    );
  });

  it('returns the existing assignment rather than a second one', async () => {
    const existing = { assignmentId: 'a1' };
    const { service, createDailyAssignment } = build({
      existingAssignment: existing,
    });

    await expect(
      service.getOrAssignTodayWord('u1', '2026-08-10'),
    ).resolves.toBe(existing);
    expect(createDailyAssignment).not.toHaveBeenCalled();
  });

  it('refuses when no profile is active', async () => {
    // Reordering put this check before the lookup; the error must still
    // be the one the dashboard swallows to render an empty state.
    const { service } = build({ activeProfile: null });

    await expect(
      service.getOrAssignTodayWord('u1', '2026-08-10'),
    ).rejects.toBeInstanceOf(UserLearningProfileNotFoundError);
  });

  it('refuses when the corpus has nothing left for this profile', async () => {
    const { service } = build({ candidate: null });

    await expect(
      service.getOrAssignTodayWord('u1', '2026-08-10'),
    ).rejects.toBeInstanceOf(CandidateWordNotFoundError);
  });
});
