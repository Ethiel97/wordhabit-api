/**
 * How long a deleted account is recoverable. The date shown to the user,
 * the restore window and the purge cutoff all derive from it, so they
 * cannot disagree.
 */
export const ACCOUNT_PURGE_GRACE_DAYS = 30;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** When an account deleted at [deletedAt] is erased for good. */
export function purgeAtFor(deletedAt: Date): Date {
  return new Date(
    deletedAt.getTime() + ACCOUNT_PURGE_GRACE_DAYS * MILLISECONDS_PER_DAY,
  );
}

/**
 * Accounts deleted before this instant have served their grace period.
 * Derived rather than stored: a `purgeAt` column would need backfilling
 * the day the grace period changes.
 */
export function purgeCutoff(now: Date): Date {
  return new Date(
    now.getTime() - ACCOUNT_PURGE_GRACE_DAYS * MILLISECONDS_PER_DAY,
  );
}
