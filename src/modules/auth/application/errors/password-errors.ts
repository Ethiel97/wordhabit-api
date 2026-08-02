import { AppError } from '../../../../shared/application/errors/app-error';

/**
 * Password-change failures, each with its own code.
 *
 * Distinct codes rather than one BAD_REQUEST: the client maps them to
 * localized copy, and a shared code would leave it with only the
 * server's English message — which is written for logs, not for users.
 */
export class PasswordMismatchError extends AppError {
  constructor(details?: Record<string, unknown>) {
    super('PASSWORD_MISMATCH', 400, 'Old password does not match.', details);
  }
}

export class PasswordUnchangedError extends AppError {
  constructor(details?: Record<string, unknown>) {
    super(
      'PASSWORD_UNCHANGED',
      400,
      'The new password is the same as the current one.',
      details,
    );
  }
}

/** The account was created through a social provider. */
export class PasswordNotSetError extends AppError {
  constructor(details?: Record<string, unknown>) {
    super(
      'PASSWORD_NOT_SET',
      400,
      'This account has no password to change.',
      details,
    );
  }
}
