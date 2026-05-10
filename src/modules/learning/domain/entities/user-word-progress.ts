export enum UserWordProgressStatus {
  NEW = 'NEW',
  SEEN = 'SEEN',
  LEARNING = 'LEARNING',
  SKIPPED = 'SKIPPED',
  MASTERED = 'MASTERED',
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
