import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mailer, MailMessage } from '../../application/ports/mailer.port';

export const EmailTemplates = {
  EMAIL_VERIFICATION: 'email-verification',
  PASSWORD_RESET: 'password-reset',
  WELCOME: 'welcome',
  WAITLIST_CONFIRMATION: 'waitlist-confirmation',
} as const;

@Injectable()
export class ResendMailerService implements Mailer {
  private readonly logger = new Logger(ResendMailerService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(message: MailMessage): Promise<void> {
    const apiKey = this.configService.getOrThrow<string>('RESEND_API_KEY');
    const from = this.configService.getOrThrow<string>('MAIL_FROM');

    const payload = message.template
      ? {
          from,
          to: [message.to],
          template: {
            id: message.template.id,
            variables: message.template.variables,
          },
        }
      : {
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `Failed to send email to ${message.to}: ${response.status} ${body}`,
      );
      throw new Error(`Email delivery failed with status ${response.status}`);
    }
  }
}
