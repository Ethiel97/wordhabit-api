export const AUTH_EMAIL_QUEUE = 'auth-emails';
export const SEND_VERIFICATION_EMAIL_JOB = 'send-verification-email';
export const SEND_WELCOME_EMAIL_JOB = 'send-welcome-email';

export interface SendVerificationEmailJobData {
  email: string;
  name: string;
  code: string;
}

export interface SendWelcomeEmailJobData {
  email: string;
  name: string;
}
