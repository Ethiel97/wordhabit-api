/**
 * The sign-in methods the application understands.
 *
 * Owned here rather than imported from the generated Prisma client: the
 * domain must not know which database — or which ORM — stores it.
 */
export enum AuthProvider {
  APPLE = 'APPLE',
  GOOGLE = 'GOOGLE',
}
