import { NestFactory } from '@nestjs/core';
import { WorkerAppModule } from './worker-app.module';
import { initializeSentry } from './shared/infrastructure/observability/sentry';
import { SentryLogger } from './shared/infrastructure/observability/sentry-logger';

async function bootstrap() {
  initializeSentry('wordhabit-worker');

  await NestFactory.createApplicationContext(WorkerAppModule, {
    logger: new SentryLogger(),
  });
}

void bootstrap();
