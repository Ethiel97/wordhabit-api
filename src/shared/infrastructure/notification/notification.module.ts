import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PUSH_SENDER } from '../../application/ports/push-sender.port';
import { FcmPushSenderService } from './fcm-push-sender.service';
import { LoggerPushSenderService } from './logger-push-sender.service';

@Module({
  providers: [
    FcmPushSenderService,
    LoggerPushSenderService,
    {
      provide: PUSH_SENDER,
      inject: [ConfigService, FcmPushSenderService, LoggerPushSenderService],
      useFactory: (
        configService: ConfigService,
        fcmPushSender: FcmPushSenderService,
        loggerPushSender: LoggerPushSenderService,
      ) => {
        // Either source will do: a path locally, the JSON itself in a
        // secret where there is no filesystem to put a file on.
        //
        // `??` would not do here — a secret set to an empty string is
        // present but useless, and would shadow the other source instead
        // of falling through to it.
        const credentials =
          nonEmpty(configService.get<string>('FIREBASE_SERVICE_ACCOUNT')) ??
          nonEmpty(configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS'));
        const projectId = configService
          .get<string>('FIREBASE_PROJECT_ID')
          ?.trim();

        return credentials && projectId ? fcmPushSender : loggerPushSender;
      },
    },
  ],
  exports: [PUSH_SENDER],
})
export class NotificationModule {}

function nonEmpty(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
