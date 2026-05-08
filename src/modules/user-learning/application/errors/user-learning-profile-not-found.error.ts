import { AppError } from '../../../../shared/application/errors/app-error';

export const USER_LEARNING_PROFILE_NOT_FOUND_ERROR_CODE =
  'USER_LEARNING_PROFILE_NOT_FOUND';

export class UserLearningProfileNotFoundError extends AppError {
  constructor(
    message = 'User learning profile not found.',
    details?: Record<string, unknown>,
  ) {
    super(USER_LEARNING_PROFILE_NOT_FOUND_ERROR_CODE, 404, message, details);
  }
}
