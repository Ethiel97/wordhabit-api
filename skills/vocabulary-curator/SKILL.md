---
name: vocabulary-curator
description: Curate vocabulary batches and ingestion plans using Wordhabit's CQRS, queue, and domain constraints.
---

# Vocabulary Curator Skill

## Purpose

Design and execute vocabulary generation work that fits this codebase's architecture:

- HTTP module enqueues ingestion work.
- Worker processes generation jobs.
- Vocabulary creation flows through commands/handlers (no direct DB writes from controllers).

## When to use

Use this skill when implementing or evolving:

- `/api/vocabulary/ingestion/generate-batch` behavior
- batch generation payload design and validation
- queue job contracts and worker-side processing
- quality controls for generated words, definitions, examples, and theme assignment

## Repository conventions to enforce

1. Keep the modular structure: `presentation -> application -> domain -> infrastructure`.
2. Route writes through command handlers and repository ports, not from controllers.
3. Keep endpoint paths in `src/shared/presentation/http/endpoints/*`.
4. Return standardized HTTP payloads with `ApiSuccessResponse.of(...)`.
5. Use queue boundaries for async workflows (`BullMQ` + worker app).

## Implementation playbook

1. Define request DTOs in module `application/dto`.
2. Define command/query contracts in `application/commands` or `application/queries`.
3. Implement handlers in `application/handlers`.
4. Keep domain validation in entities/domain services where possible.
5. Adapt persistence/IO in `infrastructure/*` and expose via repository/provider interfaces.
6. Register handlers/providers in module file and wire tokens consistently.

## Guardrails

- Do not bypass CQRS with direct Prisma calls in controllers.
- Do not introduce ad-hoc response shapes.
- Do not swallow provider/queue errors; surface explicit failures.
- Preserve deterministic normalization for terms and language metadata.
