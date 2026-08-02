import { Job } from 'bullmq';
import { AccountPurgeProcessor } from './account-purge.processor';
import { ACCOUNT_PURGE_JOBS } from './account-purge-queue.constants';
import { ACCOUNT_PURGE_GRACE_DAYS } from '../../domain/account-deletion.policy';
import type { AuthUserRepository } from '../../domain/repositories/auth-user.repository';
import { User } from '../../../user-learning/domain/entities/user';

const deletedUser = (id: string): User => ({
  id,
  email: `${id}@example.com`,
  name: id,
  password: 'hashed',
  passwordVersion: 1,
  emailVerifiedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: new Date('2026-06-01T00:00:00Z'),
});

class FakeAuthUserRepository implements Partial<AuthUserRepository> {
  constructor(
    private readonly due: User[],
    private readonly failFor: string[] = [],
  ) {}

  cutoffs: Date[] = [];
  purged: string[] = [];

  findPurgeable = (deletedBefore: Date): Promise<User[]> => {
    this.cutoffs.push(deletedBefore);
    return Promise.resolve(this.due);
  };

  purge = (userId: string): Promise<void> => {
    if (this.failFor.includes(userId)) {
      return Promise.reject(new Error('constraint violation'));
    }
    this.purged.push(userId);
    return Promise.resolve();
  };
}

const sweepJob = { name: ACCOUNT_PURGE_JOBS.SWEEP, id: '1' } as Job;

const processorFor = (repository: FakeAuthUserRepository) =>
  new AccountPurgeProcessor(repository as unknown as AuthUserRepository);

describe('AccountPurgeProcessor', () => {
  it('sweeps on a cutoff one grace period in the past', async () => {
    const repository = new FakeAuthUserRepository([]);

    await processorFor(repository).process(sweepJob);

    const [deletedBefore] = repository.cutoffs;
    const daysAgo =
      (Date.now() - deletedBefore.getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.round(daysAgo)).toBe(ACCOUNT_PURGE_GRACE_DAYS);
  });

  it('erases every account past its grace period', async () => {
    const repository = new FakeAuthUserRepository([
      deletedUser('a'),
      deletedUser('b'),
    ]);

    const result = await processorFor(repository).process(sweepJob);

    expect(repository.purged).toEqual(['a', 'b']);
    expect(result).toEqual({ purged: 2 });
  });

  it('steps over a failing account instead of abandoning the batch', async () => {
    // The next sweep retries it; losing the rest of the batch to one bad
    // row would let a single stuck account block every other deletion.
    const repository = new FakeAuthUserRepository(
      [deletedUser('a'), deletedUser('bad'), deletedUser('c')],
      ['bad'],
    );

    const result = await processorFor(repository).process(sweepJob);

    expect(repository.purged).toEqual(['a', 'c']);
    expect(result).toEqual({ purged: 2 });
  });

  it('ignores jobs it does not own', async () => {
    const repository = new FakeAuthUserRepository([deletedUser('a')]);

    await processorFor(repository).process({ name: 'something-else' } as Job);

    expect(repository.purged).toHaveLength(0);
  });
});
