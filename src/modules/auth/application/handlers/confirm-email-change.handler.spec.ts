import { ConfirmEmailChangeHandler } from './confirm-email-change.handler';
import { ConfirmEmailChangeCommand } from '../commands/confirm-email-change.command';
import type { AuthUserRepository } from '../../domain/repositories/auth-user.repository';
import type { EmailChangeRequestRepository } from '../../domain/repositories/email-change-request.repository';
import type { PasswordService } from '../../domain/services/password-service';
import { EmailChangeRequest } from '../../domain/entities/email-change-request';
import { User } from '../../../user-learning/domain/entities/user';
import { EmailAlreadyTakenError } from '../errors/auth-error';
import {
  EmailChangeCodeExpiredError,
  EmailChangeCodeInvalidError,
  NoPendingEmailChangeError,
  TooManyEmailChangeAttemptsError,
} from '../errors/email-change-errors';

const user: User = {
  id: 'u1',
  email: 'old@wordhabit.app',
  name: 'Anwuri Alabi',
  password: 'hashed',
  passwordVersion: 1,
  emailVerifiedAt: new Date('2026-05-12T00:00:00Z'),
  createdAt: new Date('2026-05-12T00:00:00Z'),
  updatedAt: new Date('2026-05-12T00:00:00Z'),
  deletedAt: null,
};

const request = (
  overrides: Partial<EmailChangeRequest> = {},
): EmailChangeRequest => ({
  id: 'r1',
  userId: 'u1',
  newEmail: 'new@wordhabit.app',
  codeHash: 'hashed:123456',
  expiresAt: new Date('2099-01-01T00:00:00Z'),
  consumedAt: null,
  attempts: 0,
  createdAt: new Date('2026-08-03T00:00:00Z'),
  ...overrides,
});

class FakeRequests implements Partial<EmailChangeRequestRepository> {
  constructor(private readonly stored: EmailChangeRequest | null) {}

  consumed: string[] = [];
  attempted: string[] = [];

  findLatestActiveByUserId = () => Promise.resolve(this.stored);
  consume = (id: string) => {
    this.consumed.push(id);
    return Promise.resolve();
  };
  incrementAttempts = (id: string) => {
    this.attempted.push(id);
    return Promise.resolve();
  };
}

const handlerFor = (
  requests: FakeRequests,
  { emailOwner = null as User | null, codeMatches = true } = {},
) => {
  const changed: { userId: string; email: string }[] = [];
  const handler = new ConfirmEmailChangeHandler(
    {
      findById: () => Promise.resolve(user),
      findByEmail: () => Promise.resolve(emailOwner),
      changeEmail: (userId: string, email: string) => {
        changed.push({ userId, email });
        return Promise.resolve({ ...user, email });
      },
    } as unknown as AuthUserRepository,
    requests as unknown as EmailChangeRequestRepository,
    {
      verify: () => Promise.resolve(codeMatches),
    } as unknown as PasswordService,
  );
  return { handler, changed };
};

describe('ConfirmEmailChangeHandler', () => {
  it('moves the account and closes the request', async () => {
    const requests = new FakeRequests(request());
    const { handler, changed } = handlerFor(requests);

    const result = await handler.execute(
      new ConfirmEmailChangeCommand('u1', '123456'),
    );

    expect(result.email).toBe('new@wordhabit.app');
    // Still verified: the address that arrives here has just answered a
    // code, so it is more proven than the one it replaces.
    expect(result.emailVerified).toBe(true);
    expect(changed).toEqual([{ userId: 'u1', email: 'new@wordhabit.app' }]);
    expect(requests.consumed).toEqual(['r1']);
  });

  it('charges an attempt for a wrong code and changes nothing', async () => {
    const requests = new FakeRequests(request());
    const { handler, changed } = handlerFor(requests, { codeMatches: false });

    await expect(
      handler.execute(new ConfirmEmailChangeCommand('u1', '000000')),
    ).rejects.toThrow(EmailChangeCodeInvalidError);

    expect(requests.attempted).toEqual(['r1']);
    expect(changed).toEqual([]);
  });

  it('stops once the attempts are spent', async () => {
    // Without this the code is a six-digit lock anyone can walk through.
    const requests = new FakeRequests(request({ attempts: 5 }));
    const { handler } = handlerFor(requests);

    await expect(
      handler.execute(new ConfirmEmailChangeCommand('u1', '123456')),
    ).rejects.toThrow(TooManyEmailChangeAttemptsError);
  });

  it('refuses an expired code', async () => {
    const requests = new FakeRequests(
      request({ expiresAt: new Date('2020-01-01T00:00:00Z') }),
    );
    const { handler } = handlerFor(requests);

    await expect(
      handler.execute(new ConfirmEmailChangeCommand('u1', '123456')),
    ).rejects.toThrow(EmailChangeCodeExpiredError);
  });

  it('refuses when nothing is pending', async () => {
    const { handler } = handlerFor(new FakeRequests(null));

    await expect(
      handler.execute(new ConfirmEmailChangeCommand('u1', '123456')),
    ).rejects.toThrow(NoPendingEmailChangeError);
  });

  it('refuses an address taken since the request', async () => {
    // Half an hour passes between the two steps; the check at request
    // time cannot speak for the moment the change actually lands.
    const requests = new FakeRequests(request());
    const { handler, changed } = handlerFor(requests, {
      emailOwner: { ...user, id: 'someone-else' },
    });

    await expect(
      handler.execute(new ConfirmEmailChangeCommand('u1', '123456')),
    ).rejects.toThrow(EmailAlreadyTakenError);

    expect(changed).toEqual([]);
  });
});
