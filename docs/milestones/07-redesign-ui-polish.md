# Milestone: Redesign And UI Polish

## Goal

Apply the final pre-deployment redesign pass now that the core product flows are implemented.

## Scope

- App shell and navigation polish.
- Typography, spacing, color, and visual hierarchy.
- Form, table, list, chart, and empty-state polish.
- Responsive mobile and desktop layout pass.
- Accessibility pass for core flows.
- Browser visual QA.

## Tasks

- Define the final visual direction for the app.
- Redesign the authenticated app shell and navigation.
- Polish log, exercise, weightlifting session, pace session, and chart pages.
- Improve form layouts and destructive action states.
- Improve empty, loading, not-found, and error states.
- Review chart readability and fallback tables.
- Audit mobile layouts for all core screens.
- Audit keyboard navigation and focus states.
- Audit color contrast and text sizing.
- Remove temporary copy or placeholder UI from earlier milestones.

## Tests

- Run lint.
- Run type check.
- Run production build.
- Run full test suite.
- Browser-check desktop and mobile layouts.
- Browser-check core flows after visual changes.
- Check browser console for severe errors.

## App Flow Check

- Sign in.
- Open logs, create/edit/delete a log.
- Create/edit/delete both exercise types.
- Create/edit/delete a weightlifting session.
- Create/edit/delete a pace session.
- Open chart-heavy exercise pages.
- Confirm empty states are clear.
- Confirm mobile layout is usable.
- Confirm keyboard focus is visible and predictable.

## Acceptance Criteria

- The app feels cohesive and ready for deployment review.
- Core workflows remain easy to scan and use.
- No text overlaps, layout jumps, or clipped controls in normal desktop/mobile viewports.
- Charts and tables remain readable.
- Accessibility basics are covered for forms, navigation, and actions.
- Automated checks still pass.

## Out Of Scope

- Vercel production deployment.
- Production database setup.
- Advanced analytics.
- Native mobile design.

## Notes

Keep this redesign focused on the product UI, not deployment infrastructure. Production readiness is the next milestone.
