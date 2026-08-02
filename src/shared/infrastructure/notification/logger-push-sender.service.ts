import { Injectable, Logger } from '@nestjs/common';
import {
  PushMessage,
  PushSender,
  PushSendResult,
} from '../../application/ports/push-sender.port';

/**
 * Development fallback used when Firebase is not configured.
 */
@Injectable()
export class LoggerPushSenderService implements PushSender {
  private readonly logger = new Logger(LoggerPushSenderService.name);

  send(messages: PushMessage[]): Promise<PushSendResult> {
    let sent = 0;

    for (const message of messages) {
      sent += message.tokens.length;
      this.logger.log(
        `[DEV PUSH] ${message.tokens.length} device(s) — "${message.title}" ` +
          `${JSON.stringify(message.data ?? {})}`,
      );
    }

    return Promise.resolve({ sent, invalidTokens: [] });
  }
}
