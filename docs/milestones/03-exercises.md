# Milestone: Exercises

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
