import { GetUserWordLibraryHandler } from './get-user-word-library.handler';
import { GetUserWordLibraryQuery } from '../queries/get-user-word-library.query';
import type { WordLibraryRepository } from '../../domain/repositories/learning.repository';
import type { UserLearningRepository } from '../../../user-learning/domain/repositories/user-learning.repository';

function build(activeProfile: unknown) {
  const findUserWordLibrary = jest
    .fn<Promise<unknown>, [Record<string, unknown>]>()
    .mockResolvedValue({ items: [], nextCursor: null, summary: {} });

  const library = { findUserWordLibrary } as unknown as WordLibraryRepository;
  const userLearning = {
    findActiveUserLearningProfile: jest.fn().mockResolvedValue(activeProfile),
  } as unknown as UserLearningRepository;

  return {
    handler: new GetUserWordLibraryHandler(library, userLearning),
    findUserWordLibrary,
  };
}

describe('GetUserWordLibraryHandler', () => {
  it('collects one language, so the mastery figures match the list', async () => {
    const { handler, findUserWordLibrary } = build({
      id: 'p-en',
      targetLanguage: 'EN',
    });

    await handler.execute(
      new GetUserWordLibraryQuery('u1', undefined, 'stub', 20, 'c1'),
    );

    expect(findUserWordLibrary).toHaveBeenCalledWith({
      userId: 'u1',
      targetLanguage: 'EN',
      status: undefined,
      search: 'stub',
      limit: 20,
      cursor: 'c1',
    });
  });

  it('answers a whole empty page when the learner has no profile yet', async () => {
    // Shape over brevity: the client parses the summary, and dropping it
    // turns "nothing collected" into a parse error.
    const { handler } = build(null);

    await expect(
      handler.execute(new GetUserWordLibraryQuery('u1')),
    ).resolves.toEqual({
      items: [],
      nextCursor: null,
      summary: {
        total: 0,
        averageMastery: 0,
        statusCounts: {
          NEW: 0,
          SEEN: 0,
          LEARNING: 0,
          MASTERED: 0,
          SKIPPED: 0,
        },
      },
    });
  });
});
