import { AppError } from '../../../../shared/application/errors/app-error';

/**
 * Email-change failures, each with its own code, for the same reason as
 * the password ones: the client maps them to localized copy.
 */
export class EmailUnchangedError extends AppError {
  constructor(details?: Record<string, unknown>) {
    super('EMAIL_UNCHANGED', 400, 'The new email is the current one.', details);
  }
}

export class NoPendingEmailChangeError extends AppError {
  constructor(details?: Record<string, unknown>) {
    super(
      'NO_PENDING_EMAIL_CHANGE',
      400,
      'No email change is waiting for confirmation.',
      details,
    );
  }
}

export class EmailChangeCodeExpiredError extends AppError {
  constructor(details?: Record<string, unknown>) {
    super(
      'EMAIL_CHANGE_CODE_EXPIRED',
      400,
      'The confirmation code has expired.',
      details,
    );
  }
}

export class EmailChangeCodeInvalidError extends AppError {
  constructor(details?: Record<string, unknown>) {
    super(
      'EMAIL_CHANGE_CODE_INVALID',
      400,
      'The confirmation code is incorrect.',
      details,
    );
  }
}

export class TooManyEmailChangeAttemptsError extends AppError {
  constructor(details?: Record<string, unknown>) {
    super(
      'TOO_MANY_EMAIL_CHANGE_ATTEMPTS',
      429,
      'Too many attempts. Request a new code.',
      details,
    );
  }
}
