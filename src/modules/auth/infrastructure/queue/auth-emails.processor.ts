import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import {
  MAILER,
  type Mailer,
} from '../../../../shared/application/ports/mailer.port';
import {
  AUTH_EMAIL_QUEUE,
  SEND_EMAIL_CHANGE_CODE_JOB,
  SEND_EMAIL_CHANGE_NOTICE_JOB,
  SendEmailChangeCodeJobData,
  SendEmailChangeNoticeJobData,
  SEND_VERIFICATION_EMAIL_JOB,
  SEND_WELCOME_EMAIL_JOB,
  SendVerificationEmailJobData,
  SendWelcomeEmailJobData,
} from './auth-email-queue.constants';
import { EmailTemplates } from '../../../../shared/infrastructure/mailer/resend-mailer.service';
import { SentryReportingWorkerHost } from '../../../../shared/infrastructure/queue/sentry-reporting-processor';

@Processor(AUTH_EMAIL_QUEUE)
export class AuthEmailsProcessor extends SentryReportingWorkerHost {
  private readonly logger = new Logger(AuthEmailsProcessor.name);

  constructor(
    @Inject(MAILER)
    private readonly mailer: Mailer,
  ) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case SEND_VERIFICATION_EMAIL_JOB:
        return this.sendVerificationEmail(
          job as Job<SendVerificationEmailJobData>,
        );
      case SEND_WELCOME_EMAIL_JOB:
        return this.sendWelcomeEmail(job as Job<SendWelcomeEmailJobData>);
      case SEND_EMAIL_CHANGE_CODE_JOB:
        return this.sendEmailChangeCode(job as Job<SendEmailChangeCodeJobData>);
      case SEND_EMAIL_CHANGE_NOTICE_JOB:
        return this.sendEmailChangeNotice(
          job as Job<SendEmailChangeNoticeJobData>,
        );
      default:
        this.logger.warn(`Unknown job ${job.name} (${job.id}) — skipping`);
    }
  }

  private async sendVerificationEmail(job: Job<SendVerificationEmailJobData>) {
    const { email, name, code } = job.data;

    this.logger.log(`Sending verification email to ${email} (job ${job.id})`);

    await this.mailer.send({
      to: email,
      template: {
        id: EmailTemplates.EMAIL_VERIFICATION,
        variables: { NAME: name, CODE: code },
      },
      subject: 'Verify your Wordhabit email',
      text: [
        `Hi ${name},`,
        '',
        `Your Wordhabit verification code is: ${code}`,
        '',
        'This code expires in 15 minutes. If you did not create a Wordhabit account, you can safely ignore this email.',
      ].join('\n'),
    });
  }

  private async sendEmailChangeCode(job: Job<SendEmailChangeCodeJobData>) {
    const { email, name, code } = job.data;

    this.logger.log(`Sending email-change code to ${email} (job ${job.id})`);

    await this.mailer.send({
      to: email,
      template: {
        id: EmailTemplates.EMAIL_CHANGE_CODE,
        variables: { NAME: name, CODE: code },
      },
      subject: `${code} is your Wordhabit confirmation code`,
      text: [
        `Hi ${name},`,
        '',
        `Your Wordhabit confirmation code is: ${code}`,
        '',
        'It expires in 30 minutes. Until you enter it, your account keeps its current email address.',
        '',
        'If you did not ask to change it, ignore this email — nothing has changed.',
      ].join('\n'),
    });
  }

  private async sendEmailChangeNotice(job: Job<SendEmailChangeNoticeJobData>) {
    const { email, name, newEmail } = job.data;

    this.logger.log(`Sending email-change notice to ${email} (job ${job.id})`);

    await this.mailer.send({
      to: email,
      template: {
        id: EmailTemplates.EMAIL_CHANGE_NOTICE,
        variables: { NAME: name, NEW_EMAIL: newEmail },
      },
      subject: 'Someone asked to change your Wordhabit email',
      text: [
        `Hi ${name},`,
        '',
        `We received a request to move your Wordhabit account to ${newEmail}.`,
        '',
        'Nothing has changed yet — the new address has to confirm first.',
        '',
        'If this was not you, change your password now: whoever asked has access to your account.',
      ].join('\n'),
    });
  }

  private async sendWelcomeEmail(job: Job<SendWelcomeEmailJobData>) {
    const { email, name } = job.data;

    this.logger.log(`Sending welcome email to ${email} (job ${job.id})`);

    await this.mailer.send({
      to: email,
      template: {
        id: EmailTemplates.WELCOME,
        variables: { NAME: name },
      },
      subject: 'Welcome to Wordhabit — your first word is waiting',
      text: [
        `Hi ${name},`,
        '',
        'Your email is verified and your streak starts now.',
        '',
        'Every day, Wordhabit gives you one meaningful word. Discover it, practice it, master it — and we bring it back right before you would forget it.',
        '',
        'Your first word is waiting in the app.',
      ].join('\n'),
    });
  }
}
