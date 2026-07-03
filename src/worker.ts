import { NestFactory } from '@nestjs/core';
import { WorkerAppModule } from './worker-app.module';
import { initializeSentry } from './shared/infrastructure/observability/sentry';

async function bootstrap() {
  initializeSentry('wordhabit-worker');

  await NestFactory.createApplicationContext(WorkerAppModule);
}

void bootstrap();
