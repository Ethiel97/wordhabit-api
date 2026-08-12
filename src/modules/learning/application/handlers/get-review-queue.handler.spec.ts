import { GetReviewQueueHandler } from './get-review-queue.handler';
import { GetReviewQueueQuery } from '../queries/get-review-queue.query';
import type { WordProgressRepository } from '../../domain/repositories/learning.repository';
import type { UserLearningRepository } from '../../../user-learning/domain/repositories/user-learning.repository';

function build(activeProfile: unknown) {
  const findReviewQueue = jest
    .fn<Promise<unknown[]>, [Record<string, unknown>]>()
    .mockResolvedValue([]);

  const progress = { findReviewQueue } as unknown as WordProgressRepository;
  const userLearning = {
    findActiveUserLearningProfile: jest.fn().mockResolvedValue(activeProfile),
  } as unknown as UserLearningRepository;

  return {
    handler: new GetReviewQueueHandler(progress, userLearning),
    findReviewQueue,
  };
}

const query = () => new GetReviewQueueQuery('u1', '2026-08-11', 5);

describe('GetReviewQueueHandler', () => {
  it('queues only the language on screen', async () => {
    const { handler, findReviewQueue } = build({
      id: 'p-fr',
      targetLanguage: 'FR',
    });

    await handler.execute(query());

    expect(findReviewQueue).toHaveBeenCalledWith({
      userId: 'u1',
      targetLanguage: 'FR',
      localDate: '2026-08-11',
      limit: 5,
    });
  });

  it('returns nothing when the learner has no profile yet', async () => {
    const { handler, findReviewQueue } = build(null);

    await expect(handler.execute(query())).resolves.toEqual({ items: [] });
    expect(findReviewQueue).not.toHaveBeenCalled();
  });
});
