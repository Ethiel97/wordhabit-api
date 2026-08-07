import { UnauthorizedException } from '@nestjs/common';
import { AuthenticateWithProviderHandler } from './authenticate-with-provider.handler';
import { AuthenticateWithProviderCommand } from '../commands/authenticate-with-provider.command';
import { AuthProvider } from '../../domain/entities/auth-provider';
import { SocialIdentity } from '../../domain/entities/social-identity';
import type { AuthUserRepository } from '../../domain/repositories/auth-user.repository';
import type { SocialIdentityVerifier } from '../../domain/services/social-identity-verifier';
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

const identity = (overrides: Partial<SocialIdentity> = {}): SocialIdentity => ({
  provider: AuthProvider.GOOGLE,
  providerUserId: 'google-sub-1',
  email: 'anwuri3@gmail.com',
  emailVerified: true,
  name: 'Anwuri Alabi',
  ...overrides,
});

class FakeAuthUserRepository implements Partial<AuthUserRepository> {
  constructor(
    private readonly byIdentity: User | null = null,
    private byEmail: User | null = null,
  ) {}

  links: Array<{ userId: string; providerUserId: string }> = [];
  created: Array<{
    email: string;
    name: string;
    password?: string;
    emailVerified?: boolean;
  }> = [];
  markedVerified: string[] = [];
  restored: string[] = [];

  findByIdentity = (): Promise<User | null> => Promise.resolve(this.byIdentity);

  findByEmail = (): Promise<User | null> => Promise.resolve(this.byEmail);

  linkIdentity = (params: {
    userId: string;
    providerUserId: string;
  }): Promise<void> => {
    this.links.push(params);
    return Promise.resolve();
  };

  create = (params: {
    email: string;
    name: string;
    password?: string;
    emailVerified?: boolean;
  }): Promise<User> => {
    this.created.push(params);
    return Promise.resolve(
      user({
        id: 'new',
        email: params.email,
        name: params.name,
        emailVerifiedAt: params.emailVerified ? new Date() : null,
      }),
    );
  };

  markEmailVerified = (userId: string): Promise<User> => {
    this.markedVerified.push(userId);
    this.byEmail = { ...this.byEmail!, emailVerifiedAt: new Date() };
    return Promise.resolve(this.byEmail);
  };

  restore = (userId: string): Promise<User> => {
    this.restored.push(userId);
    return Promise.resolve(user({ id: userId, deletedAt: null }));
  };
}

const handlerFor = (
  repository: FakeAuthUserRepository,
  asserted: SocialIdentity = identity(),
) =>
  new AuthenticateWithProviderHandler(
    repository as unknown as AuthUserRepository,
    { verify: () => Promise.resolve(asserted) },
    {
      issue: () =>
        Promise.resolve({ accessToken: 'access', refreshToken: 'refresh' }),
    } as unknown as SessionIssuer,
  );

const command = new AuthenticateWithProviderCommand(
  AuthProvider.GOOGLE,
  'token',
);

describe('AuthenticateWithProviderHandler', () => {
  it('signs in an identity it already knows, without touching the email', async () => {
    const repository = new FakeAuthUserRepository(user());
    const result = await handlerFor(repository).execute(command);

    expect(result.user.id).toBe('u1');
    expect(repository.created).toHaveLength(0);
    expect(repository.markedVerified).toHaveLength(0);
    // Replayed on every sign-in: the repository swallows the duplicate.
    expect(repository.links).toEqual([
      {
        userId: 'u1',
        provider: AuthProvider.GOOGLE,
        providerUserId: 'google-sub-1',
      },
    ]);
  });

  it('links a verified provider email to the account that owns it', async () => {
    const existing = user({ emailVerifiedAt: null });
    const repository = new FakeAuthUserRepository(null, existing);

    const result = await handlerFor(repository).execute(command);

    expect(result.user.id).toBe('u1');
    expect(repository.created).toHaveLength(0);
    // The provider vouched for the address, so an account that never
    // answered our own verification email is proven now.
    expect(repository.markedVerified).toEqual(['u1']);
    expect(result.user.emailVerified).toBe(true);
  });

  it('refuses an unverified provider email that already belongs to someone', async () => {
    // The attack this closes: creating a provider account with a
    // stranger's address, unverified, and being handed their account.
    const repository = new FakeAuthUserRepository(null, user());

    await expect(
      handlerFor(repository, identity({ emailVerified: false })).execute(
        command,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repository.links).toHaveLength(0);
    expect(repository.created).toHaveLength(0);
  });

  it('creates a passwordless account when nothing matches', async () => {
    const repository = new FakeAuthUserRepository(null, null);

    const result = await handlerFor(
      repository,
      identity({ email: 'new@example.com', providerUserId: 'sub-new' }),
    ).execute(command);

    expect(result.user.id).toBe('new');
    expect(repository.created).toEqual([
      { email: 'new@example.com', name: 'Anwuri Alabi', emailVerified: true },
    ]);
    expect(repository.created[0].password).toBeUndefined();
  });

  it('falls back to the local part when no name is offered', async () => {
    const repository = new FakeAuthUserRepository(null, null);

    await handlerFor(
      repository,
      identity({ email: 'ada@example.com', name: null }),
    ).execute(command);

    expect(repository.created[0].name).toBe('ada');
  });

  it('is born verified when the provider vouched for the address', async () => {
    // Apple and Google both check the address before issuing a token.
    // Asking for a code afterwards proves nothing, and for an Apple
    // relay address it asks the user to read a mailbox they may not.
    const repository = new FakeAuthUserRepository(null, null);

    const result = await handlerFor(
      repository,
      identity({ email: 'new@example.com' }),
    ).execute(command);

    expect(result.user.emailVerified).toBe(true);
  });

  it('prefers the name the client forwarded, which is all Apple ever gives', async () => {
    const repository = new FakeAuthUserRepository(null, null);

    await handlerFor(
      repository,
      identity({ provider: AuthProvider.APPLE, name: null }),
    ).execute(
      new AuthenticateWithProviderCommand(
        AuthProvider.APPLE,
        'token',
        '  Ada Lovelace  ',
      ),
    );

    expect(repository.created[0].name).toBe('Ada Lovelace');
  });

  it('rejects a first sign-in that carries no address at all', async () => {
    const repository = new FakeAuthUserRepository(null, null);

    await expect(
      handlerFor(repository, identity({ email: null })).execute(command),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('cancels a pending deletion rather than signing into a dying account', async () => {
    const repository = new FakeAuthUserRepository(
      user({ deletedAt: new Date('2026-08-01T00:00:00Z') }),
    );

    await handlerFor(repository).execute(command);

    expect(repository.restored).toEqual(['u1']);
  });
});
