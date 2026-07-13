export interface User {
  id: string;
  email: string;
  password: string | null;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}
