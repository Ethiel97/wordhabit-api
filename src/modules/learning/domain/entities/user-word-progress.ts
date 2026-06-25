export enum UserWordProgressStatus {
  NEW = 'NEW',
  SEEN = 'SEEN',
  LEARNING = 'LEARNING',
  SKIPPED = 'SKIPPED',
  MASTERED = 'MASTERED',
}

export enum UserWordProgressMasteryLevel {
  SEEN = 5,
  LEARNING = 10,
  MASTERED = 100,
  SKIPPED = -1,
}

export interface UserWordProgress {
  id: string;
  userId: string;
  wordId: string;
  masteryLevel: number;
  reviewCount: number;
  seenAt: Date | null;
  status: UserWordProgressStatus;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
