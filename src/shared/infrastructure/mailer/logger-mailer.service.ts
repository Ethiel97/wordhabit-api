import { Injectable, Logger } from '@nestjs/common';
import { Mailer, MailMessage } from '../../application/ports/mailer.port';

/**
 * Development fallback used when no email provider is configured.
 */
@Injectable()
export class LoggerMailerService implements Mailer {
  private readonly logger = new Logger(LoggerMailerService.name);

  send(message: MailMessage): Promise<void> {
    this.logger.log(
      `[DEV MAIL] to=${message.to} subject="${message.subject}"\n${message.text}`,
    );
    return Promise.resolve();
  }
}
