---
name: progress-coach
description: Build learner progress coaching behavior using learning and user-learning module patterns.
---

# Progress Coach Skill

## Purpose

Implement progress-aware coaching logic that recommends what a learner should review next, using existing learning progress and profile data.

## When to use

Use this skill when adding:

- review prioritization rules
- learning dashboard enrichments
- recommendation queries based on `UserWordProgress`, streaks, and active profile
- coaching API responses in `learning` endpoints

## Repository conventions to enforce

1. Keep reads in query handlers and writes in command handlers.
2. Use repository contracts (`domain/repositories`) as application dependencies.
3. Keep HTTP concerns in controllers only; business logic belongs in handlers/services.
4. Reuse existing module boundaries (`learning`, `user-learning`, `vocabulary`) instead of duplicating models.

## Implementation playbook

1. Model request/response contracts in `application/queries` and DTOs.
2. Add handler logic in `application/handlers` with narrow, testable responsibilities.
3. Reuse domain services (state machine, streak calculator, scheduler) for scoring and transitions.
4. Extend persistence adapters only where the repository contract requires new queries.
5. Keep endpoint constants centralized under `shared/presentation/http/endpoints`.

## Guardrails

- Do not compute recommendations in controllers.
- Do not hardcode status strings; use existing domain status types.
- Do not mutate learning state in query handlers.
- Keep recommendation behavior deterministic for the same input state.
