import { AppError } from '../../../../shared/application/errors/app-error';

export class EmailAlreadyTakenError extends AppError {
  constructor(details?: Record<string, unknown>) {
    super('EMAIL_ALREADY_TAKEN', 400, 'Email is already in use.', details);
  }
}
