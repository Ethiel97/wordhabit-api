export interface User {
  id: string;
  email: string;
  password: string | null;
  name: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
