import { AppError } from '../../../../shared/application/errors/app-error';

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
