import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { HEALTH } from '../../shared/presentation/http/endpoints';
import { Public } from '../auth/presentation/public.decorator';

@Controller(HEALTH.BASE)
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(HEALTH.LIVENESS)
  @Public()
  getLiveness() {
    return {
      status: 'ok',
    };
  }

  @Get(HEALTH.READINESS)
  @Public()
  async getReadiness() {
    const checks = {
      database: 'ok',
      redis: 'ok',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      checks.database = 'error';
    }

    const isReady = checks.database === 'ok';

    if (!isReady) {
      throw new ServiceUnavailableException({
        status: 'error',
        checks,
      });
    }

    return {
      status: 'ok',
      checks,
    };
  }
}
