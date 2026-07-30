# Wordhabit API

Backend service for **Wordhabit**, a vocabulary learning platform that helps users build a daily habit around useful
words, themed learning, daily assignments, and progress tracking.

## Overview

Wordhabit is a modular NestJS backend backed by PostgreSQL, Prisma, Redis, BullMQ, and AI-assisted vocabulary
generation. The current API supports:

- waitlist signups and lookup
- vocabulary words with definitions, examples, pronunciations, synonyms, and themes
- user learning profiles and onboarding
- daily word assignment
- user word progress tracking
- queued vocabulary ingestion through an AI provider
- health and readiness checks

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma v7
- **Queue**: BullMQ with Redis
- **AI provider**: OpenAI SDK
- **Architecture**: DDD-inspired modular monolith
- **Patterns**: CQRS, repository pattern, dependency injection

## Architecture

The application is organized as a modular monolith. Each feature module keeps HTTP concerns, use cases, domain
contracts, and infrastructure adapters separated.

```txt
HTTP request
  -> Controller
  -> CommandBus or QueryBus
  -> Application handler
  -> Domain repository interface
  -> Prisma repository implementation
  -> PostgreSQL
```

Background vocabulary generation uses a separate worker process:

```txt
HTTP app
  -> BullMQ job in Redis
  -> Worker app
  -> Vocabulary generation provider
  -> Create vocabulary word command
  -> PostgreSQL
```

Main entrypoints:

- `src/main.ts` starts the HTTP API.
- `src/worker.ts` starts the worker application context.
- `src/app.module.ts` wires the web-facing modules.
- `src/worker-app.module.ts` wires the queue processor and scheduler.

## Project Structure

```txt
src/
  modules/
    waitlist/
    vocabulary/
    user-learning/
    learning/
    vocabulary-ingestion/
    health/
  shared/
    application/
    infrastructure/
      database/
      queue/
    presentation/
      http/
prisma/
  schema.prisma
  migrations/
  seeders/
```

Typical module layout:

```txt
module/
  presentation/http/       # Controllers and HTTP boundary
  application/             # Commands, queries, handlers, DTOs, services
  domain/                  # Entities, repository contracts, domain services
  infrastructure/          # Prisma repositories, providers, queue adapters
```

## API Conventions

All HTTP routes are prefixed with `/api`.

Success responses use:

```json
{
  "success": true,
  "data": {}
}
```

Error responses use:

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "status": 409,
    "message": "This email already exists on the waitlist.",
    "details": {
      "path": "/api/waitlist"
    }
  }
}
```

Validation is handled globally with `ValidationPipe`. Application and HTTP errors are normalized by
`HttpExceptionFilter`.

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start local infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` and Redis on `localhost:6379`.

### 3. Configure environment

Create a `.env` file:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wordhabit"
REDIS_HOST="localhost"
REDIS_PORT="6379"
OPENAI_API_KEY=""
OPENAI_VOCABULARY_MODEL="gpt-4.1-mini"
SENTRY_DSN=""
SENTRY_ENVIRONMENT="dev"
SENTRY_TRACES_SAMPLE_RATE="0.1"
SENTRY_PROFILES_SAMPLE_RATE="0.1"
SENTRY_RELEASE=""
PORT="4000"
NODE_ENV="development"
```

You can use `REDIS_URL` instead of `REDIS_HOST` and `REDIS_PORT`.

### 4. Generate Prisma client

```bash
pnpm prisma generate
```

### 5. Run migrations

```bash
pnpm prisma migrate dev
```

### 6. Seed themes

The seed script runs from the built output, so build first:

```bash
pnpm build
pnpm db:seed
```

### 7. Start the HTTP API

```bash
pnpm start:dev
```

By default, the API runs on:

```txt
http://localhost:4000/api
```

### 8. Start the worker

Run this in a separate terminal when testing queued vocabulary ingestion:

```bash
pnpm worker:dev
```

## Environment Variables

| Variable                      | Purpose                                                                                                                                   |
|-------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| `DATABASE_URL`                | PostgreSQL connection string used by Prisma.                                                                                              |
| `REDIS_URL`                   | Optional full Redis connection URL for BullMQ.                                                                                            |
| `REDIS_HOST`                  | Redis host when `REDIS_URL` is not set. Defaults to `localhost`.                                                                          |
| `REDIS_PORT`                  | Redis port when `REDIS_URL` is not set. Defaults to `6379`.                                                                               |
| `OPENAI_API_KEY`              | API key used by vocabulary generation.                                                                                                    |
| `OPENAI_VOCABULARY_MODEL`     | Optional model override for vocabulary generation. Defaults to `gpt-4.1-mini`.                                                            |
| `SENTRY_DSN`                  | Sentry DSN. When set, error tracking and profiling are enabled for both API and worker processes.                                         |
| `SENTRY_ENVIRONMENT`          | Optional Sentry environment. Supported values are `dev` and `production`. Defaults to `dev` (or `production` when `NODE_ENV=production`). |
| `SENTRY_TRACES_SAMPLE_RATE`   | Trace sample rate from `0` to `1`. Defaults to `0.1`.                                                                                     |
| `SENTRY_PROFILES_SAMPLE_RATE` | Profile sample rate from `0` to `1`. Defaults to `0.1`.                                                                                   |
| `SENTRY_RELEASE`              | Optional release identifier used in Sentry events.                                                                                        |
| `PORT`                        | HTTP port. Local default is `4000`; Docker/Fly configs set `3000`.                                                                        |
| `NODE_ENV`                    | Runtime environment. Production enables production database schema behavior and scheduled generation.                                     |

## Endpoint Catalog

This is a compact map of the current HTTP surface, not a full API reference.

### Health

- `GET /api/health`
- `GET /api/health/ready`

### Waitlist

- `POST /api/waitlist`
- `GET /api/waitlist`
- `GET /api/waitlist/count`
- `GET /api/waitlist/by-email?email=...`

### Vocabulary Words

- `POST /api/vocabulary/words`
- `GET /api/vocabulary/words`
- `GET /api/vocabulary/words/:id`
- `GET /api/vocabulary/words/search`

### Vocabulary Themes

- `POST /api/vocabulary/themes`
- `GET /api/vocabulary/themes`
- `GET /api/vocabulary/themes/:slug`
- `PATCH /api/vocabulary/themes/:id`
- `DELETE /api/vocabulary/themes/:id`

### User Learning

- `POST /api/user-learning/profiles`
- `GET /api/user-learning/users/:userId/profiles`
- `GET /api/user-learning/users/:userId/profiles/active`
- `PATCH /api/user-learning/users/:userId/profiles/:profileId/activate`
- `PATCH /api/user-learning/profiles/:profileId/themes`

### Onboarding

- `POST /api/onboarding`

### Learning

- `GET /api/learning/random-word`
- `GET /api/learning/users/:userId/today-word`
- `GET /api/learning/users/:userId/words/:wordId/progress`
- `PATCH /api/learning/users/:userId/words/:wordId/progress`

### Vocabulary Ingestion

- `POST /api/vocabulary/ingestion/generate-batch`

## Background Jobs

Vocabulary ingestion is intentionally asynchronous:

- The HTTP API enqueues generation work in BullMQ.
- Redis stores the queue state.
- The worker consumes vocabulary generation jobs and creates vocabulary words through the same CQRS command path as
  normal application code.
- In production, `VocabularyDailyScheduler` enqueues daily generation jobs for configured language pairs.

Run both the API and worker locally when testing the ingestion endpoint.

## Development Commands

```bash
pnpm start:dev     # Start HTTP API in watch mode
pnpm worker:dev    # Start worker in watch mode
pnpm build         # Build the NestJS app
pnpm test          # Run unit tests
pnpm test:e2e      # Run e2e tests
pnpm test:cov      # Run tests with coverage
pnpm lint          # Run ESLint with fixes
pnpm format        # Format source and test TypeScript files
```

## Deployment Notes

The repository includes Docker and Fly.io configuration:

- `Dockerfile` builds the production image.
- `fly.web.toml` runs the HTTP API and applies Prisma migrations during deployment.
- `fly.worker.toml` runs the background worker process.

## Known Gaps

- Unit tests currently need maintenance; at least one controller spec does not provide required CQRS dependencies.
- Endpoint examples are intentionally compact and should not be treated as complete API documentation.
- Authentication and authorization are not represented in the inspected application code.
