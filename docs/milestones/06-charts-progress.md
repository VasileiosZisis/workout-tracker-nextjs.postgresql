# Milestone: Charts And Progress

Status: Implemented on 2026-05-17.

## Goal

Add progress views that help users understand trends across their sessions.

## Scope

- Chart-ready query functions.
- Basic charts for weightlifting and pace sessions.
- Empty and sparse-data states.
- Accessible chart summaries.

## Tasks

- Choose chart library for the first implementation.
- Use Recharts.
- Add chart data query helpers.
- Add weightlifting progress chart.
- Add pace progress chart.
- Add fallback tables or summaries for accessibility.
- Add loading and empty states.
- Confirm chart data respects ownership checks.

## Tests

- Unit test chart data mapping helpers.
- Integration test chart queries are ownership-scoped.
- Browser check chart rendering with empty, one-point, and multi-point data.
- Run lint, type check, and build.

## App Flow Check

- Sign in.
- Open an exercise with no sessions.
- Confirm chart empty state is useful.
- Add one session.
- Confirm chart renders without layout issues.
- Add multiple sessions.
- Confirm chart trend renders correctly.
- Confirm browser console has no chart errors.

## Acceptance Criteria

- Charts render reliably for empty, sparse, and populated datasets.
- Chart data belongs only to the signed-in user.
- Progress views are useful before final visual redesign.
- Tables or text summaries make key values accessible.

## Out Of Scope

- Final dashboard redesign.
- Advanced analytics.
- Exporting reports.

## Notes

Keep this milestone practical. The final visual treatment can wait until the pre-deployment redesign.

## Implementation Notes

- Added Recharts for the first chart implementation.
- Added chart-ready mapping helpers for weightlifting and pace progress data.
- Added ownership-scoped progress query helpers.
- Added weightlifting progress charts for total, working, and junk volume.
- Added pace progress charts for distance, pace, and speed.
- Added accessible fallback tables below each chart.
- Added an exercise loading state and empty progress state.

## Verification

- `npm run prisma:validate`
- `npm exec prisma migrate status`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Authenticated local route checks passed for empty, one-point, multi-point, and pace progress states.
- Manual signed-in chart rendering tested with no errors.
