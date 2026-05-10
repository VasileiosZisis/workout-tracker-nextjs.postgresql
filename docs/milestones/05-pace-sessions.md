# Milestone: Pace Sessions

## Goal

Implement pace session tracking with server-calculated pace and speed metrics.

## Scope

- Pace session Prisma model and migration.
- Zod schemas.
- Metric calculation helpers.
- Create, edit, show, and delete flows.
- Previous session display.
- Paginated session list for a pace exercise.

## Tasks

- Finalize `PaceSession` model.
- Add migration.
- Add pace and speed calculation helpers.
- Add pace Zod schemas.
- Add `createPaceSession`, `updatePaceSession`, and `deletePaceSession` actions.
- Add `/logs/[logSlug]/exercises/[exerciseSlug]/pace/new`.
- Add `/logs/[logSlug]/exercises/[exerciseSlug]/pace/[sessionId]`.
- Add `/logs/[logSlug]/exercises/[exerciseSlug]/pace/[sessionId]/edit`.
- Show previous session while creating a new session.
- Add empty state for exercises with no sessions.

## Tests

- Unit test total minutes calculation.
- Unit test pace, pace minutes, pace seconds, and speed calculation.
- Unit test zero distance and zero time cases.
- Unit test pace Zod schemas.
- Integration test action recalculates metrics instead of trusting client values.
- Integration test nested ownership for session reads and mutations.
- Run lint, type check, and build.

## App Flow Check

- Sign in.
- Create a log and pace exercise.
- Create a pace session.
- Confirm pace and speed are correct.
- Create a session with zero distance or zero time and confirm safe behavior.
- Confirm previous session appears when creating the next session.
- Edit the session and confirm metrics update.
- Delete a session.
- Confirm another user cannot access the session URL.

## Acceptance Criteria

- Pace sessions work end to end.
- Derived pace and speed metrics are calculated on the server.
- Zero-value edge cases do not crash or produce invalid UI.
- Sessions are scoped to the signed-in user, log, and exercise.

## Out Of Scope

- Unit switching.
- Final chart design.
- GPS imports or external activity integrations.

## Notes

Keep kilograms and kilometers for the first version unless the unit decision changes.
