import { GetProfilesDailyStatesHandler } from './get-profiles-daily-states.handler';
import { GetProfilesDailyStatesQuery } from '../queries/get-profiles-daily-states.query';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import type { UserLearningRepository } from '../../../user-learning/domain/repositories/user-learning.repository';

const profile = (id: string, targetLanguage: string) =>
  ({ id, targetLanguage }) as never;

function build(options: { profiles?: unknown[]; states?: unknown[] }) {
  const findProfileDayStates = jest
    .fn<Promise<unknown[]>, [Record<string, unknown>]>()
    .mockResolvedValue(options.states ?? []);

  const learning = { findProfileDayStates } as unknown as LearningRepository;
  const userLearning = {
    findUserLearningProfiles: jest
      .fn()
      .mockResolvedValue(options.profiles ?? []),
  } as unknown as UserLearningRepository;

  return {
    handler: new GetProfilesDailyStatesHandler(learning, userLearning),
    findProfileDayStates,
  };
}

const query = () => new GetProfilesDailyStatesQuery('u1', '2026-08-11');

describe('GetProfilesDailyStatesHandler', () => {
  it('returns a row for every profile, word or not', async () => {
    // The switcher shows a status per language; dropping the profiles
    // with no assignment yet would leave gaps in that list.
    const { handler } = build({
      profiles: [profile('p-en', 'EN'), profile('p-fr', 'FR')],
      states: [
        { userLearningProfileId: 'p-en', wordId: 'w1', quizCompleted: true },
      ],
    });

    const result = await handler.execute(query());

    expect(result).toEqual([
      {
        profileId: 'p-en',
        targetLanguage: 'EN',
        wordId: 'w1',
        quizCompleted: true,
      },
      {
        profileId: 'p-fr',
        targetLanguage: 'FR',
        wordId: null,
        quizCompleted: false,
      },
    ]);
  });

  it('asks for the day the caller named, not the server clock', async () => {
    const { handler, findProfileDayStates } = build({
      profiles: [profile('p-en', 'EN')],
    });

    await handler.execute(query());

    expect(findProfileDayStates).toHaveBeenCalledWith({
      userLearningProfileIds: ['p-en'],
      assignedFor: new Date('2026-08-11T00:00:00.000Z'),
    });
  });

  it('spares the database a query when there is no profile', async () => {
    const { handler, findProfileDayStates } = build({ profiles: [] });

    await expect(handler.execute(query())).resolves.toEqual([]);
    expect(findProfileDayStates).not.toHaveBeenCalled();
  });
});
