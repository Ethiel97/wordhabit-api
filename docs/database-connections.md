# Database connections: sizing the pool

## The incident this guards against

Sentry recurringly reported, from the worker's `send-daily-word` sweep:

```
PrismaClientKnownRequestError: Too many database connections opened:
too many connections for role "wordhabit_…"
```

The managed Postgres enforces a **per-role connection cap**. Every Node
process talking to it — the `wordhabit-api` web machine, the
`wordhabit-worker` machine, the second copy of each during a rolling
deploy, and `prisma migrate deploy` in the release command — draws from
that single cap.

Before the fix, `PrismaService` created its `pg.Pool` with no limits at
all, which means the `pg` defaults: **`max: 10` per process** and a 10s
idle timeout. Two processes could legitimately climb to 20 connections;
during a deploy, four processes plus the migration could reach ~43. The
error surfaced in `findActiveTimeZones` simply because it is the first
query of the half-hourly sweep: the worker's pool had gone idle and shut
its connections, so that query needed a *fresh* connection at the exact
moment the web pool held the rest of the cap.

The job fan-outs are not the cause: `DailyWordSenderProcessor`, the
02:00 vocabulary batch, and the 03:30 quiz-material backfill all iterate
recipients/words **sequentially** (one connection at a time), and BullMQ
processors run with the default concurrency of 1.

## The sizing math

Let `C` be the role's connection cap (check the provider's dashboard).
Worst case concurrent claimants on `C`:

| Claimant | Count |
| --- | --- |
| web machines × deploy overlap | 1 × 2 |
| worker machines × deploy overlap | 1 × 2 |
| `prisma migrate deploy` (release command) | ~3 connections |

So the constraint is:

```
(web + worker) × 2 × DATABASE_POOL_MAX + 3 ≤ C
```

With one web machine and one worker machine, the default
`DATABASE_POOL_MAX=5` gives:

- steady state: 2 × 5 = **10 connections**
- deploy worst case: 4 × 5 + 3 = **23 connections**

which fits any cap ≥ 25. If the role's cap is lower, set
`DATABASE_POOL_MAX` accordingly (e.g. `3` fits a cap of 15); if you add
machines, redo the math — the cap divides across **all** of them.

## What the code now does

`src/shared/infrastructure/database/prisma.service.ts`:

- `max: DATABASE_POOL_MAX` (default 5) instead of pg's default 10;
- `idleTimeoutMillis: 30_000` so a quiet process returns its share;
- `connectionTimeoutMillis: 10_000` so cap exhaustion fails fast with a
  clear error instead of hanging;
- `disposeExternalPool: true` + `onModuleDestroy → $disconnect()`, and
  `enableShutdownHooks()` in both `main.ts` and `worker.ts`, so a
  machine Fly stops actually releases its connections instead of
  leaving them to Postgres's TCP reaper.

## If the cap ever gets tight again

Prefer putting a pooler in front rather than shrinking pools further:
most managed Postgres providers expose a pooled (pgbouncer,
transaction-mode) connection string alongside the direct one. Point
`DATABASE_URL` at it and the per-role cap effectively stops being the
binding constraint. Keep the *direct* URL for `prisma migrate deploy`
(migrations and advisory locks don't mix with transaction pooling).
