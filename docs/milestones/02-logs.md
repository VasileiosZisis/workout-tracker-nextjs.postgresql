# Milestone: Logs

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
