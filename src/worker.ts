import { NestFactory } from '@nestjs/core';
import { WorkerAppModule } from './worker-app.module';
import { initializeSentry } from './shared/infrastructure/observability/sentry';
import { SentryLogger } from './shared/infrastructure/observability/sentry-logger';

async function bootstrap() {
  initializeSentry('wordhabit-worker');

  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    logger: new SentryLogger(),
  });

  // Fly stops machines with a signal; without this, the pool's
  // connections linger against the role cap until Postgres reaps them.
  app.enableShutdownHooks();
}

void bootstrap();
