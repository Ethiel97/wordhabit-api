// No credential fields here: password and its version belong to the
// auth module's own User. This entity answers "who is learning", and
// none of its consumers verifies anything.
export interface User {
  id: string;
  email: string;
  name: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /**
   * Set while a deletion is pending; null on a live account.
   *
   * The reason the user gave is deliberately *not* here: it is written
   * once and read only by analytics, so putting it on the shared entity
   * would force every producer of a `User` to carry a field none of
   * them has an opinion about.
   */
  deletedAt: Date | null;
}
