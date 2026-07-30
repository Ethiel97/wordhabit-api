export const ACCOUNT_PURGE_QUEUE = 'account-purge';

export const ACCOUNT_PURGE_JOBS = {
  SWEEP: 'sweep-expired-accounts',
} as const;

/**
 * How often the sweep looks for accounts past their grace period.
 *
 * Hourly: the grace period is 30 days, so the exact minute of erasure
 * does not matter, and an hourly pass keeps each batch small.
 */
export const ACCOUNT_PURGE_SWEEP_CRON = '0 * * * *';

/**
 * Stable job id, so restarting the API re-registers the same repeatable
 * job instead of stacking a new one on every boot.
 */
export const ACCOUNT_PURGE_SWEEP_JOB_ID = 'account-purge-sweep';
