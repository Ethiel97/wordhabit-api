/**
 * Why an account was deleted, as offered by the delete flow.
 *
 * String values, not the numeric members TypeScript defaults to: the
 * wire format is the name, `@IsEnum` validates against it, and the
 * Prisma enum has the same members — so the two map by identity
 * instead of through a translation table.
 */
export enum AccountDeletionReason {
  TOO_MANY_NOTIFICATIONS = 'TOO_MANY_NOTIFICATIONS',
  LOST_MY_STREAK = 'LOST_MY_STREAK',
  NOT_LEARNING_ENOUGH = 'NOT_LEARNING_ENOUGH',
  TOO_EXPENSIVE = 'TOO_EXPENSIVE',
  FOUND_BETTER = 'FOUND_BETTER',
  OTHER = 'OTHER',
}
