# Milestone: Pace Sessions

Status: Implemented on 2026-05-17.

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

## Implementation Notes

- Added the `PaceSession` model.
- Added migration `20260517155005_add_pace_sessions`.
- Pace sessions use database ids in URLs.
- Pace exercises now show paginated pace session lists.
- Time, distance, pace, pace minutes, pace seconds, and speed are stored for reporting.
- Pace and speed metrics are calculated on the server from submitted time and distance.
- Zero-distance and zero-time edge cases return safe zero metrics instead of invalid values.

## Verification

- `npm run prisma:validate`
- `npm exec prisma migrate status`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Authenticated local route check passed for pace exercise detail, new session, show session, and edit session pages.
- Manual browser flow still needs your signed-in session to confirm create, zero-value edge cases, previous session display, edit, and delete from the UI.
