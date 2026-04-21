import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  enableShutdownHooks(app: INestApplication) {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
