import { NotFoundException } from '@nestjs/common';
import { DeleteAccountHandler } from './delete-account.handler';
import { DeleteAccountCommand } from '../commands/delete-account.command';
import { AccountDeletionReason } from '../../domain/entities/account-deletion-reason';
import type { AuthUserRepository } from '../../domain/repositories/auth-user.repository';
import { User } from '../../domain/entities/user';
import { ACCOUNT_PURGE_GRACE_DAYS } from '../../domain/account-deletion.policy';

const liveUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  email: 'anwuri3@gmail.com',
  name: 'Anwuri Alabi',
  password: 'hashed',
  passwordVersion: 1,
  emailVerifiedAt: new Date('2026-05-12T00:00:00Z'),
  createdAt: new Date('2026-05-12T00:00:00Z'),
  updatedAt: new Date('2026-05-12T00:00:00Z'),
  deletedAt: null,
  ...overrides,
});

/** Records the write so a test can assert the reason reached the store. */
class FakeAuthUserRepository implements Partial<AuthUserRepository> {
  constructor(private user: User) {}

  softDeleteCalls: { userId: string; reason?: AccountDeletionReason }[] = [];

  findById = (userId: string): Promise<User | null> =>
    Promise.resolve(this.user.id === userId ? this.user : null);

  softDelete = (params: {
    userId: string;
    reason?: AccountDeletionReason;
  }): Promise<User> => {
    this.softDeleteCalls.push(params);
    this.user = { ...this.user, deletedAt: new Date('2026-07-29T10:00:00Z') };
    return Promise.resolve(this.user);
  };
}

const handlerFor = (repository: FakeAuthUserRepository) =>
  new DeleteAccountHandler(repository as unknown as AuthUserRepository);

describe('DeleteAccountHandler', () => {
  it('schedules the purge a grace period after deactivation', async () => {
    const repository = new FakeAuthUserRepository(liveUser());

    const result = await handlerFor(repository).execute(
      new DeleteAccountCommand('u1', AccountDeletionReason.LOST_MY_STREAK),
    );

    expect(repository.softDeleteCalls).toEqual([
      { userId: 'u1', reason: AccountDeletionReason.LOST_MY_STREAK },
    ]);
    expect(result.deactivatedAt).toEqual(new Date('2026-07-29T10:00:00Z'));

    const graceInDays =
      (result.purgeAt.getTime() - result.deactivatedAt.getTime()) /
      (24 * 60 * 60 * 1000);
    expect(graceInDays).toBe(ACCOUNT_PURGE_GRACE_DAYS);
  });

  it('accepts a deletion with no reason given', async () => {
    const repository = new FakeAuthUserRepository(liveUser());

    await handlerFor(repository).execute(new DeleteAccountCommand('u1'));

    expect(repository.softDeleteCalls).toEqual([
      { userId: 'u1', reason: undefined },
    ]);
  });

  it('returns the existing schedule instead of restarting the clock', async () => {
    // A retried request — flaky network, double tap. The user already has
    // what they asked for, so this must not error and must not push the
    // erasure date back by another 30 days.
    const deletedAt = new Date('2026-07-01T08:00:00Z');
    const repository = new FakeAuthUserRepository(liveUser({ deletedAt }));

    const result = await handlerFor(repository).execute(
      new DeleteAccountCommand('u1'),
    );

    expect(repository.softDeleteCalls).toHaveLength(0);
    expect(result.deactivatedAt).toEqual(deletedAt);
    expect(result.purgeAt).toEqual(new Date('2026-07-31T08:00:00Z'));
  });

  it('rejects an unknown user', async () => {
    const repository = new FakeAuthUserRepository(liveUser({ id: 'other' }));

    await expect(
      handlerFor(repository).execute(new DeleteAccountCommand('u1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
