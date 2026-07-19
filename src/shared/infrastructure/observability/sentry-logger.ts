import { ConsoleLogger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

export class SentryLogger extends ConsoleLogger {
  error(message: unknown, ...optionalParams: unknown[]): void {
    super.error(message, ...optionalParams);

    if (
      this.context === 'ExceptionsHandler' ||
      optionalParams.includes('ExceptionsHandler')
    ) {
      // Avoid double reporting of exceptions handled by Nest's ExceptionsHandler
      return;
    }

    if (message instanceof Error) {
      Sentry.captureException(message);
      return;
    }

    // Nest convention: logger.error(message, stack?, context?)
    const [stack] = optionalParams;
    Sentry.captureMessage(String(message), {
      level: 'error',
      extra: typeof stack === 'string' ? { stack } : undefined,
    });
  }
}
