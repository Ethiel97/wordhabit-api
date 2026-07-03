export interface UserLearningStreak {
  id: string;
  userId: string;
  lastActivityDate: Date;
  currentStreak: number;
  longestStreak: number;
  createdAt: Date;
  updatedAt: Date;
}
