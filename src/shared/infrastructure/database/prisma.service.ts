import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../../generated/prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const options =
      process.env.NODE_ENV === 'production'
        ? '-c search_path=wordhabit'
        : undefined;

    const schema =
      process.env.NODE_ENV === 'production' ? 'wordhabit' : 'public';

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      options,
    });

    const adapter = new PrismaPg(pool, { schema });

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
