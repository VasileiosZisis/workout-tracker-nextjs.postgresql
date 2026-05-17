# Milestone: Exercises

Status: Implemented on 2026-05-17.

## Goal

Allow users to manage exercises inside owned logs.

## Scope

- Exercise Prisma model and migration.
- Exercise Zod schemas.
- Nested ownership checks.
- Exercise list inside a log.
- Create, edit, show, and delete exercise screens.
- Session kind selection.
- Pagination for exercise lists.
- Note: exercise list pagination is not needed yet because the v1 log detail screen shows a simple owned exercise list. Add pagination when real data volume requires it.

## Tasks

- Finalize the `Exercise` model.
- Add migration for exercises.
- Add `SessionKind` enum.
- Add slug generation scoped to each log.
- Add `createExercise`, `updateExercise`, and `deleteExercise` Server Actions.
- Add `getExerciseBySlug` query helper.
- Add `/logs/[logSlug]/exercises/new`.
- Add `/logs/[logSlug]/exercises/[exerciseSlug]`.
- Add `/logs/[logSlug]/exercises/[exerciseSlug]/edit`.
- Show session kind on the exercise page.
- Add empty state for logs with no exercises.

## Tests

- Unit test exercise schemas.
- Unit test scoped exercise slug generation.
- Integration test nested ownership checks.
- Integration test deleting an exercise does not affect another user's data.
- Run lint, type check, and build.

## App Flow Check

- Sign in.
- Create a log.
- Create a weightlifting exercise.
- Create a pace exercise.
- Open each exercise.
- Edit an exercise title and session kind according to the allowed rules.
- Delete an exercise.
- Confirm another user cannot access the exercise URL.

## Acceptance Criteria

- Exercises belong to a user and a log.
- Exercise slugs are unique within a log, not globally.
- Only the owner can read or mutate exercises.
- The UI clearly distinguishes weightlifting and pace exercise types.

## Out Of Scope

- Creating sessions.
- Charts.
- Exercise templates or predefined exercise lists.

## Notes

Do not add complex exercise libraries yet. The old app lets users name their own exercises, and this rewrite should preserve that simple model.

## Implementation Notes

- Added `SessionKind` and `Exercise` to the Prisma schema.
- Added migration `20260517124737_add_exercises`.
- Exercise slugs are unique per log through `@@unique([logId, slug])`.
- Exercise queries always scope by signed-in user and parent log.
- Create, edit, show, and delete exercise routes are implemented under `/logs/[logSlug]/exercises`.
- Added focused tests for exercise validation, slug creation, and nested ownership queries.
- Prisma migration initially hit a stale advisory lock from an idle connection; the lock holder was terminated and the migration applied successfully.

## Verification

- `npm run prisma:validate`
- `npm exec prisma migrate status`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Manual app flow tested: create, edit, cancel from edit, and delete exercises inside logs.
