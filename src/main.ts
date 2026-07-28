import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './shared/presentation/http/http-exception.filter';
import { initializeSentry } from './shared/infrastructure/observability/sentry';
import { SentryLogger } from './shared/infrastructure/observability/sentry-logger';

async function bootstrap() {
  initializeSentry('wordhabit-api');

  const app = await NestFactory.create(AppModule, {
    logger: new SentryLogger(),
  });

  app.setGlobalPrefix('api', {
    exclude: ['nestlens', 'nestlens/*', '__nestlens__', '__nestlens__/*'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
