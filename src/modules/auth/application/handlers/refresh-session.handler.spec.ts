import { UnauthorizedException } from '@nestjs/common';
import { RefreshSessionHandler } from './refresh-session.handler';
import { RefreshSessionCommand } from '../commands/refresh-session.command';
import type { AuthUserRepository } from '../../domain/repositories/auth-user.repository';
import type { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import type { RefreshTokenService } from '../../domain/services/refresh-token-service';
import type { SessionIssuer } from '../services/session-issuer.service';
import { RefreshToken } from '../../domain/entities/refresh-token';
import { User } from '../../../user-learning/domain/entities/user';

const user: User = {
  id: 'u1',
  email: 'anwuri3@gmail.com',
  name: 'Anwuri Alabi',
  password: 'hashed',
  passwordVersion: 1,
  emailVerifiedAt: new Date('2026-05-12T00:00:00Z'),
  createdAt: new Date('2026-05-12T00:00:00Z'),
  updatedAt: new Date('2026-05-12T00:00:00Z'),
  deletedAt: null,
};

const token = (overrides: Partial<RefreshToken> = {}): RefreshToken => ({
  id: 'rt1',
  userId: 'u1',
  // The fake service hashes by prefixing, so this is `hash('valid')`.
  tokenHash: 'hashed:valid',
  expiresAt: new Date('2099-01-01T00:00:00Z'),
  createdAt: new Date('2026-05-12T00:00:00Z'),
  revokedAt: null,
  replacedByTokenId: null,
  ...overrides,
});

class FakeRefreshTokenRepository implements Partial<RefreshTokenRepository> {
  constructor(private readonly stored: RefreshToken | null) {}

  revoked: { id: string; replacedBy?: string }[] = [];
  revokedUsers: string[] = [];

  findByHash = (tokenHash: string): Promise<RefreshToken | null> =>
    Promise.resolve(
      this.stored && this.stored.tokenHash === tokenHash ? this.stored : null,
    );

  revoke = (id: string, replacedBy?: string): Promise<void> => {
    this.revoked.push({ id, replacedBy });
    return Promise.resolve();
  };

  revokeAllForUser = (userId: string): Promise<void> => {
    this.revokedUsers.push(userId);
    return Promise.resolve();
  };
}

const handlerFor = (
  repository: FakeRefreshTokenRepository,
  { storedUser = user } = {},
) =>
  new RefreshSessionHandler(
    repository as unknown as RefreshTokenRepository,
    {
      hash: (value: string) => `hashed:${value}`,
    } as unknown as RefreshTokenService,
    {
      findById: () => Promise.resolve(storedUser),
    } as unknown as AuthUserRepository,
    {
      issue: () =>
        Promise.resolve({
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          refreshTokenId: 'rt2',
        }),
    } as unknown as SessionIssuer,
  );

describe('RefreshSessionHandler', () => {
  it('rotates: the presented token is spent and points at its successor', async () => {
    const repository = new FakeRefreshTokenRepository(token());

    const result = await handlerFor(repository).execute(
      new RefreshSessionCommand('valid'),
    );

    expect(result).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    // Spent, and linked to what replaced it — the chain a support agent
    // walks when a session goes wrong.
    expect(repository.revoked).toEqual([{ id: 'rt1', replacedBy: 'rt2' }]);
    expect(repository.revokedUsers).toEqual([]);
  });

  it('ends every session when a spent token comes back', async () => {
    // Rotation is what makes this detectable: the legitimate client
    // never holds a revoked token, so a second use means a copy exists.
    const repository = new FakeRefreshTokenRepository(
      token({ revokedAt: new Date('2026-08-01T00:00:00Z') }),
    );

    await expect(
      handlerFor(repository).execute(new RefreshSessionCommand('valid')),
    ).rejects.toThrow(UnauthorizedException);

    expect(repository.revokedUsers).toEqual(['u1']);
  });

  it('refuses an expired token without ending the other sessions', async () => {
    // Ordinary lapse, not an attack: signing the user's other devices
    // out for it would be a self-inflicted outage.
    const repository = new FakeRefreshTokenRepository(
      token({ expiresAt: new Date('2020-01-01T00:00:00Z') }),
    );

    await expect(
      handlerFor(repository).execute(new RefreshSessionCommand('valid')),
    ).rejects.toThrow(UnauthorizedException);

    expect(repository.revokedUsers).toEqual([]);
  });

  it('refuses an unknown token', async () => {
    const repository = new FakeRefreshTokenRepository(null);

    await expect(
      handlerFor(repository).execute(new RefreshSessionCommand('nonsense')),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('refuses to revive a session on a deleted account', async () => {
    // The rows survive the grace period, so the token outlives the
    // right to use it.
    const repository = new FakeRefreshTokenRepository(token());

    await expect(
      handlerFor(repository, {
        storedUser: { ...user, deletedAt: new Date('2026-08-01T00:00:00Z') },
      }).execute(new RefreshSessionCommand('valid')),
    ).rejects.toThrow(UnauthorizedException);

    expect(repository.revokedUsers).toEqual(['u1']);
  });
});
