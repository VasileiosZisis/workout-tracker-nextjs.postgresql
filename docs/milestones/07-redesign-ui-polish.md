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

## Visual Direction

Use **Performance Lab** as the main product direction, with a light **Quantified Self** influence in the information architecture so the app can grow beyond workout tracking later.

Visual thesis:

- A mobile-first training intelligence app with a dark technical workspace, flat surfaces, spacious layouts, and bright metric accents.
- The app should help users enter training data, read factual evidence, and decide what to improve in day-to-day activity.
- The UI should feel analytical and precise, not generic gym-themed or lifestyle-heavy.

Style decisions:

- Keep the placeholder product name `Workout Trackr` until the final naming decision.
- Use dark mode only for this redesign pass.
- Use flat colors; avoid glassmorphism and glossy surfaces.
- Gradients are acceptable for background depth, but primary UI surfaces should remain flat and readable.
- Use a spacious mobile-first layout with fewer items per screen and stronger hierarchy.
- Use a bottom navigation pattern on mobile.
- Use bright amber, violet, blue, and lime accents for visually important metrics, charts, and status cues.
- Prioritize working volume, hard sets, and pace as the most important v1 metrics.
- Aim for Apple Fitness clarity, but darker, flatter, more technical, and more evidence-oriented.

Information architecture direction:

- Treat workouts as the first data domain, not the whole product boundary.
- Keep page and navigation labels flexible enough to support future metrics such as recovery, bodyweight, habits, or broader performance indicators.
- Favor progress, evidence, and trend language over motivational fitness copy.

Avoid:

- Glassy color treatments.
- Overly compact dashboard layouts.
- Card-heavy generic SaaS composition.
- Decorative fitness imagery that does not help users read or enter data.
- Copy that sounds like marketing instead of product UI.

## Tasks

- Define the final visual direction for the app. Done.
- Redesign the authenticated app shell and navigation. Done.
- Polish log, exercise, weightlifting session, pace session, and chart pages. Done.
- Improve form layouts and destructive action states. Done.
- Improve empty, loading, not-found, and error states. Done.
- Review chart readability and fallback tables. Done.
- Audit mobile layouts for all core screens. Done.
- Audit keyboard navigation and focus states. Done.
- Audit color contrast and text sizing. Done.
- Remove temporary copy or placeholder UI from earlier milestones. Done.

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
