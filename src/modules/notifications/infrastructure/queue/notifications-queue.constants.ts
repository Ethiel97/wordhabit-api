export const NOTIFICATIONS_SENDER_QUEUE = 'notifications_sender';

export const SEND_DAILY_WORD_NOTIFICATION_JOB = 'send-daily-word-notification';

/** Its own queue: DailyWordSenderProcessor completes any job it does not recognise. */
export const STREAK_RISK_QUEUE = 'notifications_streak_risk';

export const SEND_STREAK_RISK_NOTIFICATION_JOB =
  'send-streak-risk-notification';
