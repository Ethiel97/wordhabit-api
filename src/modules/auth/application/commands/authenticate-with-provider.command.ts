import { Command } from '@nestjs/cqrs';
import { AuthProvider } from '../../domain/entities/auth-provider';
import { LoginUserResult } from './login-user.command';

/**
 * Signing in through Apple or Google returns exactly what a password
 * login returns: the client should not care which door was used.
 */
export type AuthenticateWithProviderResult = LoginUserResult;

export class AuthenticateWithProviderCommand extends Command<AuthenticateWithProviderResult> {
  constructor(
    public readonly provider: AuthProvider,
    /** The provider's identity token, verified server-side. */
    public readonly idToken: string,
    /**
     * Apple hands the display name to the client on the first
     * authorisation and never again, so the client forwards it here.
     * Ignored once the account exists.
     */
    public readonly name?: string,
  ) {
    super();
  }
}
