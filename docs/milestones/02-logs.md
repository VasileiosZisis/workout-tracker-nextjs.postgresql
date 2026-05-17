# Milestone: Logs

## Status

Implemented.

Verification completed:

- `Log` Prisma model was added.
- Migration `20260517122532_add_logs` was created and applied.
- Prisma migration status reports the database is up to date.
- Slug generation is scoped to each user.
- Log Zod validation is implemented.
- Log query helpers are ownership-scoped.
- Log Server Actions are implemented for create, update, and delete.
- `/logs`, `/logs/new`, `/logs/[logSlug]`, and `/logs/[logSlug]/edit` are implemented.
- Delete flow includes a client-side confirmation prompt.
- Empty state and pagination are implemented.
- Unit tests cover slug generation and validation.
- Integration tests cover ownership-scoped log queries.
- Prisma schema validation passes.
- Vitest passes.
- ESLint passes.
- TypeScript check passes.
- Production build passes.
- Authenticated server logs show `/logs` and `/profile` returning 200 after Google sign-in.

Manual verification still useful:

- Create a log through the browser.
- Edit the log title and confirm the URL slug updates when no collision exists.
- Delete the log and confirm it disappears.

## Goal

Build the first full vertical slice: authenticated users can manage their own logs.

## Scope

- Log Prisma model and migration.
- Log Zod schemas.
- Log query functions.
- Log Server Actions.
- List, create, edit, show, and delete log screens.
- Pagination.
- Ownership checks.

## Tasks

- Finalize the `Log` model.
- Add migration for logs.
- Add slug generation scoped to each user.
- Add `createLog`, `updateLog`, and `deleteLog` Server Actions.
- Add `getLogsPage` and `getLogBySlug` query helpers.
- Add `/logs`.
- Add `/logs/new`.
- Add `/logs/[logSlug]`.
- Add `/logs/[logSlug]/edit`.
- Add delete confirmation behavior.
- Add empty states for no logs.
- Add validation and action error handling.

## Tests

- Unit test slug generation.
- Unit test log Zod schemas.
- Integration test ownership-scoped log queries.
- Integration test create/update/delete actions where practical.
- Run lint, type check, and build.

## App Flow Check

- Sign in.
- Open `/logs`.
- Confirm empty state appears.
- Create a log.
- Confirm redirect to the expected log or list page.
- Edit the log title.
- Confirm slug behavior matches the selected rule.
- Delete the log.
- Confirm it disappears.
- Confirm another user cannot see or mutate the log.

## Acceptance Criteria

- Users can manage logs end to end.
- Log data is always filtered by signed-in user on the server.
- Pagination handles invalid query params safely.
- Empty, validation error, and success states are usable.

## Out Of Scope

- Exercises.
- Sessions.
- Charts.
- Admin features.

## Notes

This milestone proves the app's main architecture: Prisma, Auth.js user ownership, Server Actions, Zod, revalidation, and route structure.
