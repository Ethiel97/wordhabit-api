import { UnauthorizedException } from '@nestjs/common';
import { LoginUserHandler } from './login-user.handler';
import { LoginUserCommand } from '../commands/login-user.command';
import type { AuthUserRepository } from '../../domain/repositories/auth-user.repository';
import type { PasswordService } from '../../domain/services/password-service';
import type { SessionIssuer } from '../services/session-issuer.service';
import { User } from '../../../user-learning/domain/entities/user';

const user = (overrides: Partial<User> = {}): User => ({
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

class FakeAuthUserRepository implements Partial<AuthUserRepository> {
  constructor(private stored: User | null) {}

  restoreCalls: string[] = [];

  findByEmail = (): Promise<User | null> => Promise.resolve(this.stored);

  restore = (userId: string): Promise<User> => {
    this.restoreCalls.push(userId);
    this.stored = { ...this.stored!, deletedAt: null };
    return Promise.resolve(this.stored);
  };
}

const handlerFor = (
  repository: FakeAuthUserRepository,
  { passwordMatches = true } = {},
) =>
  new LoginUserHandler(
    repository as unknown as AuthUserRepository,
    {
      issue: () =>
        Promise.resolve({
          accessToken: 'token',
          refreshToken: 'refresh',
          refreshTokenId: 'rt1',
        }),
    } as unknown as SessionIssuer,
    {
      verify: () => Promise.resolve(passwordMatches),
    } as unknown as PasswordService,
  );

describe('LoginUserHandler', () => {
  it('cancels a pending deletion when the user logs back in', async () => {
    // The promise the deletion receipt makes: log in before the erasure
    // date and the account comes back.
    const repository = new FakeAuthUserRepository(
      user({ deletedAt: new Date('2026-07-20T08:00:00Z') }),
    );

    const result = await handlerFor(repository).execute(
      new LoginUserCommand('anwuri3@gmail.com', 'correct-horse'),
    );

    expect(repository.restoreCalls).toEqual(['u1']);
    // Restoring must not cost the user their verified email, or the
    // launch routing table sends them back to the verify screen.
    expect(result.user.emailVerified).toBe(true);
  });

  it('leaves a live account untouched', async () => {
    const repository = new FakeAuthUserRepository(user());

    await handlerFor(repository).execute(
      new LoginUserCommand('anwuri3@gmail.com', 'correct-horse'),
    );

    expect(repository.restoreCalls).toHaveLength(0);
  });

  it('does not restore an account on a failed password attempt', async () => {
    // Otherwise anyone who knows the address could keep a deleted
    // account alive indefinitely by guessing at the password.
    const repository = new FakeAuthUserRepository(
      user({ deletedAt: new Date('2026-07-20T08:00:00Z') }),
    );

    await expect(
      handlerFor(repository, { passwordMatches: false }).execute(
        new LoginUserCommand('anwuri3@gmail.com', 'wrong'),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repository.restoreCalls).toHaveLength(0);
  });
});
