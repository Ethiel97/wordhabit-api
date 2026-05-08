import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

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
            },
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
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
