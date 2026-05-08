export interface UserWordProgress {
  id: string;
  userId: string;
  wordId: string;
  masteryLevel: number;
  reviewCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
