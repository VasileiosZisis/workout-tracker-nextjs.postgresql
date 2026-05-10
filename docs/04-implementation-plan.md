# Implementation Plan

Detailed milestone checklists live in [Milestones](06-milestones.md). Use those files as the execution source of truth once implementation begins.

## Phase 0: Finalize Decisions

Resolve:

- Auth approach
- Database hosting/local dev approach
- Deployment target
- UI direction
- Unit behavior
- Slug/session URL behavior

See `05-open-decisions.md`.

## Phase 1: Scaffold The App

Tasks:

- Create a Next.js TypeScript app in this repository.
- Add linting and formatting.
- Add Prisma and PostgreSQL configuration.
- Add environment variable examples.
- Add basic app route groups.
- Add shared layout, app shell, and error/not-found pages.

Expected result:

- App boots locally.
- Type checking and linting run.
- Prisma validates.

## Phase 2: Database Foundation

Tasks:

- Create the Prisma schema.
- Add migrations.
- Add Prisma client helper.
- Add seed script with sample user, log, exercise, and sessions.
- Add core domain calculation helpers with tests.

Expected result:

- Database can be migrated from empty state.
- Sample data supports building the first screens.

## Phase 3: Auth Foundation

Tasks:

- Add Auth.js config and handlers.
- Add Prisma adapter models.
- Add Google provider.
- Add sign-in/sign-out flow.
- Add session helper functions.
- Add protected app layout.
- Add Prisma relations from workout records to the Auth.js `User` model.

Expected result:

- Authenticated routes are protected.
- Current user can be loaded server-side.

## Phase 4: Logs Vertical Slice

Tasks:

- Build `/logs`.
- Build create/edit/delete log flows.
- Add Zod schemas and Server Actions.
- Add ownership checks.
- Add pagination.

Expected result:

- A signed-in user can manage logs end to end.

## Phase 5: Exercises Vertical Slice

Tasks:

- Build exercise list inside a log.
- Build create/edit/delete exercise flows.
- Add session kind selection.
- Add scoped slug behavior.

Expected result:

- A signed-in user can manage exercises inside owned logs.

## Phase 6: Weightlifting Sessions

Tasks:

- Build create/edit/show/delete flows.
- Add dynamic set editor as a Client Component.
- Calculate volumes server-side.
- Add latest previous-session display.
- Add progress table/chart.

Expected result:

- Weightlifting tracking is feature-complete.

## Phase 7: Pace Sessions

Tasks:

- Build create/edit/show/delete flows.
- Calculate pace and speed server-side.
- Add latest previous-session display.
- Add progress table/chart.

Expected result:

- Pace tracking is feature-complete.

## Phase 8: Polish And Production Hardening

Tasks:

- Add loading and empty states.
- Add accessibility pass.
- Add metadata and Open Graph.
- Add CSP and security headers.
- Add rate limiting to sensitive actions.
- Add production migration/deploy scripts.
- Add basic end-to-end tests for core flows.

Expected result:

- The app is ready for staging deployment.

## Suggested First Vertical Slice

Start with logs because it exercises the full architecture with the smallest domain surface:

- Authenticated page read
- Server Action create/edit/delete
- Zod validation
- Prisma relation ownership
- Pagination
- Revalidation and redirects
