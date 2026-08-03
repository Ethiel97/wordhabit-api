import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import {
  PushMessage,
  PushSender,
  PushSendResult,
} from '../../application/ports/push-sender.port';
import {
  assertProjectMatches,
  readServiceAccount,
} from './firebase-credentials';

/** FCM's own ceiling for sendEachForMulticast. */
const MAX_TOKENS_PER_CALL = 500;

/**
 * The only error codes that mean the device is gone. Anything else —
 * quota, unavailability, a malformed payload — is a problem with this
 * send, not with the token.
 */
const GONE_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

@Injectable()
export class FcmPushSenderService implements PushSender, OnModuleInit {
  private readonly logger = new Logger(FcmPushSenderService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    // Hot reload re-runs this against a live default app, which
    // initializeApp rejects.
    if (getApps().length > 0) return;

    const projectId = this.configService
      .getOrThrow<string>('FIREBASE_PROJECT_ID')
      .trim();

    const account = readServiceAccount({
      inline: this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT'),
      path: this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS'),
    });

    // Fails the boot rather than the delivery: pushing to the wrong
    // project succeeds silently, one user at a time, forever.
    assertProjectMatches(account, projectId);

    initializeApp({
      // The admin SDK wants camelCase; the file Google issues is
      // snake_case, so the two names are spelled out rather than spread.
      credential: cert({
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: account.private_key,
      }),
      projectId,
    });

    this.logger.log(`Firebase messaging ready for project ${projectId}`);
  }

  async send(messages: PushMessage[]): Promise<PushSendResult> {
    const result: PushSendResult = { sent: 0, invalidTokens: [] };

    for (const message of messages) {
      for (const tokens of chunk(message.tokens, MAX_TOKENS_PER_CALL)) {
        const batch = await this.sendBatch(message, tokens);
        result.sent += batch.sent;
        result.invalidTokens.push(...batch.invalidTokens);
      }
    }

    return result;
  }

  private async sendBatch(
    message: PushMessage,
    tokens: string[],
  ): Promise<PushSendResult> {
    const response = await getMessaging().sendEach(
      tokens.map((token) => ({
        token,
        notification: { title: message.title, body: message.body },
        data: message.data,
        ...(message.androidChannelId && {
          android: {
            notification: { channelId: message.androidChannelId },
          },
        }),
      })),
    );

    const invalidTokens: string[] = [];

    // Responses are positional, so the index is what ties a failure back
    // to the token that caused it.
    response.responses.forEach((individual, index) => {
      if (individual.success) return;

      const code = individual.error?.code ?? 'unknown';
      if (GONE_ERROR_CODES.has(code)) {
        invalidTokens.push(tokens[index]);
        return;
      }

      this.logger.warn(`Push failed for one device: ${code}`);
    });

    return { sent: response.successCount, invalidTokens };
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('Chunk size must be greater than 0');
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
