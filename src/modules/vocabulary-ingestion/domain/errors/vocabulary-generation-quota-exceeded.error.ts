/**
 * The generation account is out of credit.
 *
 * Its own type because it is the one generation failure that is
 * *certain* to happen again on a retry: a timeout, a 500 or a rate
 * limit all clear on their own, a spent quota does not. Callers that
 * retry — the nightly queue — use it to give up on the first attempt
 * instead of burning two more and raising three alerts for one cause.
 */
export class VocabularyGenerationQuotaExceededError extends Error {
  constructor(cause?: unknown) {
    super('Vocabulary generation quota exceeded.');
    this.name = 'VocabularyGenerationQuotaExceededError';
    this.cause = cause;
  }
}
