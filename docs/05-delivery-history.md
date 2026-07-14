# Delivery History

The application was built as vertical milestones. Each milestone combined
implementation, focused automated coverage, and a manual flow check before the
next domain surface was added.

These files are historical delivery records. The top-level architecture, data
model, routing, and production documents describe the current system when a
historical checklist differs from later implementation.

## Milestones

| # | Milestone | Outcome |
| --- | --- | --- |
| 0 | [Foundation](milestones/00-foundation.md) | Next.js, TypeScript, Prisma, validation pipeline, and route groups |
| 1 | [Authentication](milestones/01-auth.md) | Auth.js Google OAuth, Prisma Adapter, database sessions, and protected routes |
| 2 | [Logs](milestones/02-logs.md) | Ownership-scoped log CRUD, slugs, and pagination |
| 3 | [Exercises](milestones/03-exercises.md) | Nested exercise CRUD and session-kind modeling |
| 4 | [Weightlifting](milestones/04-weightlifting-sessions.md) | Transactional session/set CRUD and volume metrics |
| 5 | [Pace](milestones/05-pace-sessions.md) | Pace-session CRUD and pace/speed metrics |
| 6 | [Progress](milestones/06-charts-progress.md) | Date-range queries, Recharts views, and accessible data tables |
| 7 | [UI redesign](milestones/07-redesign-ui-polish.md) | Mobile-first Performance Lab interface and interaction polish |
| 8 | [Production readiness](milestones/08-production-readiness.md) | Vercel/Neon deployment, security policy, observability, and runbook |

## Delivery Method

The order was intentionally vertical:

1. Establish the shared runtime, schema, and verification baseline.
2. Add authentication before user-owned domain data.
3. Exercise the full read/mutation/validation pattern with logs.
4. Add nested ownership with exercises.
5. Add one session domain at a time with tested calculations.
6. Build progress views only after the source data was stable.
7. Redesign after workflows were complete.
8. Add deployment and operational controls before launch.

## Completion Gate

A milestone was considered complete when its implementation, focused tests,
repository checks, and browser flow had been exercised. The current aggregate
repository gate is:

```bash
npm run check
npm run prisma:validate
```

Deployment verification remains environment-specific because Preview OAuth is
disabled and production database operations require explicit branch checks.
