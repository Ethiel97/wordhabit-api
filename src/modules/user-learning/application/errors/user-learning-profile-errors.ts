import { AppError } from '../../../../shared/application/errors/app-error';

/**
 * Everything a learning profile can refuse, each with its own code.
 *
 * Distinct codes rather than one BAD_REQUEST: the client maps them to
 * localized copy, and a shared code would leave it with only the
 * server's English message, which is written for logs.
 */

export const USER_LEARNING_PROFILE_NOT_FOUND_ERROR_CODE =
  'USER_LEARNING_PROFILE_NOT_FOUND';

/** Also returned when the profile belongs to someone else, so an id
 * cannot be probed for existence. */
export class UserLearningProfileNotFoundError extends AppError {
  constructor(
    message = 'User learning profile not found.',
    details?: Record<string, unknown>,
  ) {
    super(USER_LEARNING_PROFILE_NOT_FOUND_ERROR_CODE, 404, message, details);
  }
}

export const USER_LEARNING_PROFILE_ALREADY_EXISTS_ERROR_CODE =
  'USER_LEARNING_PROFILE_ALREADY_EXISTS';

export class UserLearningProfileAlreadyExistsError extends AppError {
  constructor(targetLanguage: string) {
    super(
      USER_LEARNING_PROFILE_ALREADY_EXISTS_ERROR_CODE,
      409,
      `User learning profile for target language ${targetLanguage} already exists.`,
      { targetLanguage },
    );
  }
}

export const USER_LEARNING_PROFILE_LIMIT_REACHED_ERROR_CODE =
  'USER_LEARNING_PROFILE_LIMIT_REACHED';

export class UserLearningProfileLimitReachedError extends AppError {
  constructor(limit: number, isPro: boolean) {
    super(
      USER_LEARNING_PROFILE_LIMIT_REACHED_ERROR_CODE,
      403,
      `This account may hold at most ${limit} learning profiles.`,
      { limit, isPro },
    );
  }
}

export const USER_LEARNING_PROFILE_MAIN_PROFILE_DELETION_ERROR_CODE =
  'USER_LEARNING_PROFILE_MAIN_PROFILE_DELETION';

export class UserLearningProfileMainProfileDeletionError extends AppError {
  constructor(
    message = 'Cannot delete main user learning profile.',
    details?: Record<string, unknown>,
  ) {
    super(
      USER_LEARNING_PROFILE_MAIN_PROFILE_DELETION_ERROR_CODE,
      400,
      message,
      details,
    );
  }
}

export const USER_LEARNING_PROFILE_READ_ONLY_ERROR_CODE =
  'USER_LEARNING_PROFILE_READ_ONLY';

export class UserLearningProfileReadOnlyError extends AppError {
  constructor(profileId: string) {
    super(
      USER_LEARNING_PROFILE_READ_ONLY_ERROR_CODE,
      403,
      'This profile is read-only until the subscription is reactivated.',
      { profileId },
    );
  }
}

export const REMINDER_SLOT_TAKEN_ERROR_CODE = 'REMINDER_SLOT_TAKEN';

export class ReminderSlotTakenError extends AppError {
  constructor(slot: string, targetLanguage: string) {
    super(
      REMINDER_SLOT_TAKEN_ERROR_CODE,
      409,
      `The ${slot} reminder already belongs to the ${targetLanguage} profile.`,
      { slot, targetLanguage },
    );
  }
}
