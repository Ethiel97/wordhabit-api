import { AppError } from '../../../../shared/application/errors/app-error';

export class CandidateWordNotFoundError extends AppError {
  constructor(
    message: string = 'Candidate word not found.',
    details?: Record<string, unknown>,
  ) {
    super('CANDIDATE_WORD_NOT_FOUND', 404, message, details);
  }
}
