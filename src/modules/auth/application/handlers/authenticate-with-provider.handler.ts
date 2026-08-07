import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger, UnauthorizedException } from '@nestjs/common';
import {
  AuthenticateWithProviderCommand,
  AuthenticateWithProviderResult,
} from '../commands/authenticate-with-provider.command';
import {
  AUTH_USER_REPOSITORY,
  type AuthUserRepository,
} from '../../domain/repositories/auth-user.repository';
import {
  SOCIAL_IDENTITY_VERIFIER,
  type SocialIdentityVerifier,
} from '../../domain/services/social-identity-verifier';
import { SocialIdentity } from '../../domain/entities/social-identity';
import { SessionIssuer } from '../services/session-issuer.service';
import { User } from '../../../user-learning/domain/entities/user';

@CommandHandler(AuthenticateWithProviderCommand)
export class AuthenticateWithProviderHandler implements ICommandHandler<
  AuthenticateWithProviderCommand,
  AuthenticateWithProviderResult
> {
  private readonly logger = new Logger(AuthenticateWithProviderHandler.name);

  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,

    @Inject(SOCIAL_IDENTITY_VERIFIER)
    private readonly verifier: SocialIdentityVerifier,

    private readonly sessionIssuer: SessionIssuer,
  ) {}

  async execute(
    command: AuthenticateWithProviderCommand,
  ): Promise<AuthenticateWithProviderResult> {
    const identity = await this.verifier.verify(
      command.provider,
      command.idToken,
    );

    const user = await this.resolveUser(identity, command.name);
    const activeUser = user.deletedAt
      ? await this.authUserRepository.restore(user.id)
      : user;

    await this.authUserRepository.linkIdentity({
      userId: activeUser.id,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
    });

    const session = await this.sessionIssuer.issue(activeUser);

    return {
      user: {
        id: activeUser.id,
        email: activeUser.email,
        name: activeUser.name,
        emailVerified: activeUser.emailVerifiedAt !== null,
      },
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  }

  /**
   * Three doors, tried in order: the identity we already know, the
   * account that owns the address, or a new account.
   */
  private async resolveUser(
    identity: SocialIdentity,
    forwardedName?: string,
  ): Promise<User> {
    const known = await this.authUserRepository.findByIdentity(
      identity.provider,
      identity.providerUserId,
    );
    if (known) return known;

    const linked = await this.linkToExistingAccount(identity);
    if (linked) return linked;

    return this.createAccount(identity, forwardedName);
  }

  /**
   * Attaches the provider to an account that already owns the address —
   * but only on the provider's word that it verified the address.
   *
   * Without that condition, anyone able to create an account at the
   * provider using someone else's address would inherit their WordHabit
   * account. An unverified address is treated as no address at all.
   */
  private async linkToExistingAccount(
    identity: SocialIdentity,
  ): Promise<User | null> {
    if (!identity.email || !identity.emailVerified) return null;

    const existing = await this.authUserRepository.findByEmail(identity.email);
    if (!existing) return null;

    this.logger.log('Linking a provider to an existing account', {
      userId: existing.id,
      provider: identity.provider,
    });

    // The provider vouches for the address, so an account that never
    // answered our own verification email is proven now.
    return existing.emailVerifiedAt
      ? existing
      : this.authUserRepository.markEmailVerified(existing.id);
  }

  private async createAccount(
    identity: SocialIdentity,
    forwardedName?: string,
  ): Promise<User> {
    if (!identity.email) {
      // Apple can withhold the address on every authorisation after the
      // first. A returning user is caught by findByIdentity above, so
      // reaching here means a first sign-in we cannot name an account
      // for — better a clear failure than an account with no address.
      throw new UnauthorizedException('The provider returned no email address');
    }

    // The address is ours already, but the provider would not vouch for
    // it — so we may neither attach to that account nor take the address
    // for a new one. Refusing beats a unique-constraint 500, and beats
    // handing over an account on an unproven claim.
    const owner = await this.authUserRepository.findByEmail(identity.email);
    if (owner) {
      this.logger.warn('Refused an unverified provider email already in use', {
        provider: identity.provider,
      });
      throw new UnauthorizedException(
        'That email already belongs to an account. Sign in with your password.',
      );
    }

    return this.authUserRepository.create({
      email: identity.email,
      // Apple gives the name once, to the client, which forwards it.
      // Google puts it in the token. Falling back to the local part
      // beats an empty greeting on the home screen.
      name: this.pickName(identity, forwardedName),
      // The provider already proved the address, so asking the user to
      // answer a code would be asking them to prove it twice — and for
      // an Apple relay address, to a mailbox they may never read.
      emailVerified: identity.emailVerified,
      // No password on purpose: this account has no other way in until
      // its owner sets one.
    });
  }

  private pickName(identity: SocialIdentity, forwardedName?: string): string {
    const candidate = forwardedName?.trim() || identity.name?.trim();
    if (candidate) return candidate;

    return identity.email!.split('@')[0];
  }
}
