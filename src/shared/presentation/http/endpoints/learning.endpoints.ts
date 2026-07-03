export const LEARNING = {
  BASE: 'learning',
  RANDOM_WORD: 'random-word',
  TODAY_WORD: 'users/:userId/today-word',
  WORD_PROGRESS: 'users/:userId/words/:wordId/progress',
  REVIEW_QUEUE: 'users/:userId/review-queue',
  WORD_REVIEW: 'users/:userId/words/:wordId/review',
  DASHBOARD: 'users/:userId/dashboard',
  LIBRARY: 'users/:userId/library',
} as const;
