import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { DefaultJobOptions } from 'bullmq';

const ONE_HOUR_SECONDS = 3600;
const ONE_WEEK_SECONDS = 7 * 24 * ONE_HOUR_SECONDS;

// Safety net for every queue: retries with backoff, and bounded retention so
// finished jobs never accumulate in Redis. Per-job options passed to
// queue.add() take precedence over these.
const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { age: ONE_HOUR_SECONDS, count: 1000 },
  removeOnFail: { age: ONE_WEEK_SECONDS, count: 5000 },
};

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL')?.trim();

        if (redisUrl) {
          return {
            connection: {
              url: redisUrl,
              // Fly private networking (*.internal) is IPv6-only; ioredis
              // resolves IPv4 by default and would fail to connect.
              ...(redisUrl.includes('.internal') ? { family: 6 } : {}),
            },
            defaultJobOptions,
          };
        }

        const redisHost =
          configService.get<string>('REDIS_HOST') ?? 'localhost';
        const configuredPort = Number(configService.get<string>('REDIS_PORT'));
        const redisPort =
          Number.isFinite(configuredPort) && configuredPort > 0
            ? configuredPort
            : 6379;

        return {
          connection: {
            host: redisHost,
            port: redisPort,
          },
          defaultJobOptions,
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
