export const AUTH_EMAIL_QUEUE = 'auth-emails';
export const SEND_VERIFICATION_EMAIL_JOB = 'send-verification-email';
export const SEND_WELCOME_EMAIL_JOB = 'send-welcome-email';
export const SEND_EMAIL_CHANGE_CODE_JOB = 'send-email-change-code';
export const SEND_EMAIL_CHANGE_NOTICE_JOB = 'send-email-change-notice';

export interface SendVerificationEmailJobData {
  email: string;
  name: string;
  code: string;
}

export interface SendWelcomeEmailJobData {
  email: string;
  name: string;
}

/** Sent to the address being claimed: the code proves it is reachable. */
export interface SendEmailChangeCodeJobData {
  email: string;
  name: string;
  code: string;
}

/**
 * Sent to the address being left behind.
 *
 * Nothing to do, and that is the point: it is the only way a learner
 * learns that someone else is moving their account, while the old
 * address still reaches them.
 */
export interface SendEmailChangeNoticeJobData {
  email: string;
  name: string;
  newEmail: string;
}
