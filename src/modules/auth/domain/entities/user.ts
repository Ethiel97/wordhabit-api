/**
 * The account as auth sees it: the one entity allowed to carry
 * credential material. Other modules model the same row without
 * `password`/`passwordVersion` (user-learning's User) — keep it that
 * way.
 */
export interface User {
  id: string;
  email: string;
  password: string | null;
  name: string;
  emailVerifiedAt: Date | null;
  passwordVersion: number;
  createdAt: Date;
  updatedAt: Date;
  /** Set while a deletion is pending; null on a live account. */
  deletedAt: Date | null;
}
