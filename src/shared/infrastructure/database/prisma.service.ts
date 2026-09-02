import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../../generated/prisma/client';
import { Pool } from 'pg';

/**
 * Every running process opens up to DATABASE_POOL_MAX connections
 * against the same Postgres role, and the role's cap is shared by all
 * of them at once: web and worker machines, both sides of a rolling
 * deploy. Each fly.toml names its own share of the 60-connection role
 * cap; this default serves local development, which has neither.
 */
const DEFAULT_POOL_MAX = 5;

function poolMax(): number {
  const configured = Number(process.env.DATABASE_POOL_MAX);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_POOL_MAX;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
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
      max: poolMax(),
      // Idle connections are handed back so a quiet process does not
      // sit on a share of the role cap another machine needs.
      idleTimeoutMillis: 30_000,
      // A clear timeout when the cap is hit, instead of queueing
      // forever behind connections that will never arrive.
      connectionTimeoutMillis: 10_000,
    });

    const adapter = new PrismaPg(pool, {
      schema,
      // The pool is ours but its lifetime should follow the client's:
      // $disconnect must actually return the connections to Postgres.
      disposeExternalPool: true,
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
