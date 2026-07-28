export interface UserLearningStreak {
  id: string;
  userId: string;
  /** `yyyy-MM-dd`, or null before the first activity. */
  lastActivityLocalDate: string | null;
  currentStreak: number;
  longestStreak: number;
  createdAt: Date;
  updatedAt: Date;
}
