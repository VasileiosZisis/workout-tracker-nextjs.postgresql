# Workout Tracker Next.js/PostgreSQL Rewrite

This repository is the planned rewrite of `C:\Users\gonea\repos\workouttrackr-react-mongo`.

The rewrite starts with an empty PostgreSQL database. MongoDB data migration is intentionally out of scope.

## Target Stack

- Next.js App Router
- React Server Components for read-heavy authenticated screens
- Server Actions for form mutations
- Route Handlers only where HTTP endpoints are useful outside the UI
- PostgreSQL
- Prisma ORM and Prisma Migrate
- Zod validation shared between form actions and route handlers
- Auth.js with Prisma Adapter
- TypeScript
- npm

## Documentation

- [Project Brief](docs/00-project-brief.md)
- [Architecture](docs/01-architecture.md)
- [Data Model](docs/02-data-model.md)
- [Routing And Actions](docs/03-routing-and-actions.md)
- [Implementation Plan](docs/04-implementation-plan.md)
- [Open Decisions](docs/05-open-decisions.md)
- [Milestones](docs/06-milestones.md)

## Current Assumptions

- The new app should preserve the current core product: logs, exercises, weightlifting sessions, pace sessions, account management, and progress charts.
- The app should fix old authorization behavior by querying only the signed-in user's records on the server.
- Slugs should be scoped instead of globally unique, so two users can create the same log or exercise names.
- Derived metrics such as volume, pace, and speed should be calculated on the server, not trusted from client input.

## Current Status

Milestones 0-6 are implemented: foundation, Auth.js with Google OAuth/database sessions, log CRUD, exercise CRUD inside logs, weightlifting session CRUD, pace session CRUD, and progress charts with accessible summary tables. Next step: manually confirm signed-in chart rendering, then continue to [Milestone 7: Production Readiness](docs/milestones/07-production-readiness.md).
