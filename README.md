# Wordhabit API

Backend service for **Wordhabit**, a vocabulary learning platform designed to help users build a daily habit of learning new words through spaced repetition, flashcards, and gamification.

---

## Overview

Wordhabit is built as a **modular, scalable backend** using **NestJS** and **Prisma**, with a strong focus on:

* Clean architecture
* CQRS (Command Query Responsibility Segregation)
* Separation of concerns
* Type safety and maintainability

The first implemented feature is the **Waitlist system**, allowing users to join early access from the landing page.

---

## Tech Stack

* **Framework**: NestJS
* **Language**: TypeScript
* **Database**: PostgreSQL
* **ORM**: Prisma (v7)
* **Architecture**: Modular Monolith (DDD-inspired)
* **Patterns**:

    * CQRS (via `@nestjs/cqrs`)
    * Repository Pattern
    * Dependency Injection

---

## Project Structure

```txt
src/
  modules/
    waitlist/
      application/
        commands/
        dto/
        handlers/
      domain/
        repositories/
      infrastructure/
        persistence/
      presentation/
        http/
      waitlist.module.ts

  shared/
    infrastructure/
      database/
        prisma.service.ts
        database.module.ts
    presentation/
      http/
        api-success-response.ts
        api-error-response.ts
        http-exception.filter.ts
```

---

## Architecture Principles

### 1. Separation of Concerns

| Layer          | Responsibility                  |
| -------------- | ------------------------------- |
| Presentation   | HTTP (controllers)              |
| Application    | Use cases (commands, handlers)  |
| Domain         | Business contracts (interfaces) |
| Infrastructure | Technical details (Prisma, DB)  |

---

### 2. CQRS (Pragmatic)

* **Commands** represent write operations
* **Handlers** execute business logic
* **CommandBus** dispatches actions

Example:

```txt
Controller → Command → Handler → Repository → Database
```

---

### 3. Dependency Inversion

Application logic depends on **interfaces**, not implementations.

```ts
@Inject(WAITLIST_REPOSITORY)
private readonly repository: WaitlistRepository;
```

---

## API Design

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "This email is already on the waitlist.",
    "details": { ... }
  }
}
```

Handled globally via a **custom exception filter**.

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

---

### 2. Configure environment

Create a `.env` file:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/wordhabit"
```

---

### 3. Generate Prisma client

```bash
pnpm prisma generate
```

---

### 4. Run migrations

```bash
pnpm prisma migrate dev
```

---

### 5. Start the server

```bash
pnpm start:dev
```

Server runs on:

```txt
http://localhost:3000/api
```

---

## Available Endpoints

### Join Waitlist

```http
POST /api/waitlist
```

#### Request

```json
{
  "email": "test@wordhabit.com",
  "source": "landing-page"
}
```

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "test@wordhabit.com",
    "status": "PENDING",
    "createdAt": "..."
  }
}
```

#### Error (Duplicate)

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "This email is already on the waitlist."
  }
}
```

---

## Development Notes

### Validation

* Powered by `class-validator`
* Enforced globally via `ValidationPipe`

---

### Database

* Prisma Client is injected via a **global ****`PrismaService`**
* Uses a single connection lifecycle managed by NestJS

---

### Error Handling

* Centralized via `HttpExceptionFilter`
* Ensures consistent API responses across the application

---

## Roadmap

* [ ] Vocabulary module (words, definitions, examples)
* [ ] Flashcards & spaced repetition engine
* [ ] User accounts & authentication
* [ ] Streaks & gamification
* [ ] Domain events + Outbox pattern
* [ ] Microservices extraction (future evolution)

---

## Philosophy

This project is built to:

* Learn and apply **production-grade backend architecture**
* Avoid “quick and dirty” patterns
* Prioritize **clarity, structure, and scalability**

---

## Author

Built by **Ethiel Adiassa**
Senior Software Engineer — Flutter & Backend Systems

---

## License

MIT
