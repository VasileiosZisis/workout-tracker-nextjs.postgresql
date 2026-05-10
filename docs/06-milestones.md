# Milestones

Use these milestones as the execution checklist for the rewrite. Each milestone should leave the app in a working state and should not be considered complete until its tests and app flow checks pass.

## Milestone Order

1. [Foundation](milestones/00-foundation.md)
2. [Auth](milestones/01-auth.md)
3. [Logs](milestones/02-logs.md)
4. [Exercises](milestones/03-exercises.md)
5. [Weightlifting Sessions](milestones/04-weightlifting-sessions.md)
6. [Pace Sessions](milestones/05-pace-sessions.md)
7. [Charts And Progress](milestones/06-charts-progress.md)
8. [Production Readiness](milestones/07-production-readiness.md)

## Completion Rule

A milestone is complete only when:

- Its implementation tasks are done.
- Automated tests for that milestone pass.
- The app flow check has been run in the browser.
- Regressions from previous milestones have been checked.
- Acceptance criteria are satisfied.

## Testing Strategy

Use focused tests where they create confidence:

- Unit tests for pure domain logic, derived metrics, slug helpers, and Zod schemas.
- Integration tests for Prisma query helpers, Server Actions, and ownership checks.
- Browser flow checks for routing, auth, forms, navigation, and user-visible states.
- Build/type/lint checks before marking major milestones complete.

## App Flow Check Format

Each milestone has a manual flow checklist. During implementation, also use browser automation where practical to confirm:

- Page loads without console errors.
- Forms submit and show expected success/error states.
- Navigation works from the user's point of view.
- Empty, loading, and populated states are usable.
- User-owned data is not visible to another user.

## Regression Rule

Before moving to the next milestone, rerun the most important flow from each earlier milestone. Keep this lightweight, but do not skip auth and ownership checks.
