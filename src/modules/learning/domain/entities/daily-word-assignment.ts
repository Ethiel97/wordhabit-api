export interface DailyWordAssignment {
  id: string;
  userId: string;
  wordId: string;
  userLearningProfileId: string;
  assignedFor: Date;
  createdAt: Date;
}
