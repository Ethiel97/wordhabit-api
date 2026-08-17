export interface UserLearningStreak {
  id: string;
  userId: string;
  /** `yyyy-MM-dd`, or null before the first activity. */
  lastActivityLocalDate: string | null;
  currentStreak: number;
  longestStreak: number;
  /**
   * What the last gap cost, or null when no break is pending repair.
   *
   * currentStreak restarts at 1 the moment activity resumes, so the
   * length that was lost only survives here.
   */
  brokenStreak: number | null;
  /** Last day of that lost chain, `yyyy-MM-dd`. */
  brokenOnLocalDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}
