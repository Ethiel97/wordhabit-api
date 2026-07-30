/**
 * How long a deleted account is recoverable before it is erased.
 *
 * One number, one place. The date the user is shown, the window in
 * which logging back in restores the account, and the cutoff the purge
 * job sweeps on are all derived from it — so they can never disagree.
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
 *
 * The purge job sweeps on this rather than on a stored `purgeAt`: a
 * second timestamp in the table would drift the day the grace period
 * changes, and would need backfilling.
 */
export function purgeCutoff(now: Date): Date {
  return new Date(
    now.getTime() - ACCOUNT_PURGE_GRACE_DAYS * MILLISECONDS_PER_DAY,
  );
}
