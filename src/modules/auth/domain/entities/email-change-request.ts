export type EmailChangeRequest = {
  id: string;
  userId: string;
  newEmail: string;
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  attempts: number;
  createdAt: Date;
};
