# Wordhabit Agents Roadmap

This document tracks **upcoming product agents** for the Wordhabit platform and the expected API/worker responsibilities for each.

## Status legend

- **Planned**: defined concept, not implemented
- **In progress**: implementation started
- **Shipped**: available in production
- **Blocked**: waiting on dependency or product decision

## Upcoming agents

| Agent                    | Primary goal                                                                   | Trigger                                         | API/worker touchpoints                                            | Skill spec                           | Status  |
|--------------------------|--------------------------------------------------------------------------------|-------------------------------------------------|-------------------------------------------------------------------|--------------------------------------|---------|
| Vocabulary Curator Agent | Generate and curate high-quality vocabulary sets by theme and level.           | Scheduled daily jobs and manual batch requests. | `vocabulary-ingestion` module, queue worker, vocabulary commands. | `skills/vocabulary-curator/SKILL.md` | Planned |
| Daily Assignment Agent   | Assign each learner a relevant daily word based on active profile and history. | Daily schedule and first app open of the day.   | `learning` module, profile data, progress repositories.           | TBD                                  | Planned |
| Progress Coach Agent     | Analyze learner progress and suggest next words/review focus.                  | After progress updates and periodic snapshots.  | `learning` + `user-learning` modules, progress query handlers.    | `skills/progress-coach/SKILL.md`     | Planned |
| Theme Expansion Agent    | Propose and validate new vocabulary themes from usage and demand trends.       | Weekly schedule and admin request.              | `vocabulary/themes` commands and analytics inputs.                | TBD                                  | Planned |

## Readiness checklist per agent

1. Domain contract and use-case definition completed.
2. Command/query handlers and DTO contracts added.
3. Queue job contract (if async) defined and versioned.
4. Observability in place (logs, metrics, failure alerts).
5. Rollout guardrails defined (feature flag, rate limits, fallback behavior).
