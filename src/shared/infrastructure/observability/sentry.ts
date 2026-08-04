import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const DEFAULT_TRACES_SAMPLE_RATE = 0.1;
const DEFAULT_PROFILES_SAMPLE_RATE = 0.1;
type SentryEnvironment = 'dev' | 'production';

function parseSampleRate(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsedValue = Number.parseFloat(value);

  if (Number.isNaN(parsedValue) || parsedValue < 0 || parsedValue > 1) {
    return fallback;
  }

  return parsedValue;
}

function resolveSentryEnvironment(): SentryEnvironment {
  const configuredEnvironment = (
    process.env.SENTRY_ENVIRONMENT ??
    process.env.NODE_ENV ??
    'dev'
  )
    .trim()
    .toLowerCase();

  if (
    configuredEnvironment === 'production' ||
    configuredEnvironment === 'prod'
  ) {
    return 'production';
  }

  return 'dev';
}

export function initializeSentry(serviceName: string): void {
  const dsn = process.env.SENTRY_DSN?.trim();

  if (!dsn) {
    return;
  }

  const tracesSampleRate = parseSampleRate(
    process.env.SENTRY_TRACES_SAMPLE_RATE,
    DEFAULT_TRACES_SAMPLE_RATE,
  );
  const profilesSampleRate = parseSampleRate(
    process.env.SENTRY_PROFILES_SAMPLE_RATE,
    DEFAULT_PROFILES_SAMPLE_RATE,
  );

  Sentry.init({
    dsn,
    environment: resolveSentryEnvironment(),
    release: process.env.SENTRY_RELEASE,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate,
    profilesSampleRate,
    initialScope: {
      tags: {
        service: serviceName,
      },
    },
  });
}
