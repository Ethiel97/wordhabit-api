import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { RevenueCatAuthGuard } from './revenue-cat-auth.guard';

const SECRET = 'Bearer s3cr3t-value-long-enough-to-matter';

function contextWith(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: authorization === undefined ? {} : { authorization },
      }),
    }),
  } as unknown as ExecutionContext;
}

function guardWith(secret?: string): RevenueCatAuthGuard {
  const config = { get: () => secret } as unknown as ConfigService;
  return new RevenueCatAuthGuard(config);
}

describe('RevenueCatAuthGuard', () => {
  beforeEach(() => {
    // The guard logs on every rejection; silence it so a passing run
    // does not look like an incident.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('lets the configured secret through', () => {
    expect(guardWith(SECRET).canActivate(contextWith(SECRET))).toBe(true);
  });

  it('fails closed when no secret is configured', () => {
    // The case that matters most: an unset variable must not become an
    // open door. A guard that returned true here would hand out free
    // subscriptions to anyone who found the URL.
    expect(() => guardWith(undefined).canActivate(contextWith(SECRET))).toThrow(
      UnauthorizedException,
    );
  });

  it('fails closed on an empty secret, which is how a blank env var arrives', () => {
    expect(() => guardWith('').canActivate(contextWith(SECRET))).toThrow(
      UnauthorizedException,
    );
  });

  it('refuses a request with no Authorization header', () => {
    expect(() => guardWith(SECRET).canActivate(contextWith())).toThrow(
      UnauthorizedException,
    );
  });

  it('refuses a wrong value of the same length', () => {
    // Built from the secret so the lengths cannot drift apart: this case
    // exists to exercise the constant-time comparison, which is only
    // reached when the sizes already match.
    const sameLength = `${SECRET.slice(0, -1)}X`;
    expect(sameLength).toHaveLength(SECRET.length);
    expect(sameLength).not.toBe(SECRET);

    expect(() =>
      guardWith(SECRET).canActivate(contextWith(sameLength)),
    ).toThrow(UnauthorizedException);
  });

  it('refuses a value of a different length without throwing from the comparison', () => {
    // timingSafeEqual throws on mismatched lengths, and that throw would
    // itself leak the length. The guard compares sizes first, so this
    // must surface as an ordinary refusal.
    expect(() =>
      guardWith(SECRET).canActivate(contextWith('Bearer x')),
    ).toThrow(UnauthorizedException);
  });

  it('refuses the secret with the Bearer prefix stripped', () => {
    // The likeliest misconfiguration in practice: the prefix present on
    // one side only. It must refuse rather than quietly accept.
    expect(() =>
      guardWith(SECRET).canActivate(contextWith(SECRET.replace('Bearer ', ''))),
    ).toThrow(UnauthorizedException);
  });
});
