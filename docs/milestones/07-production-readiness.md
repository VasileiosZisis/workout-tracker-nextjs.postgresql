# Milestone: Production Readiness

## Goal

Prepare the app for deployment and the pre-launch redesign pass.

## Scope

- Vercel deployment configuration.
- Neon production and development branch setup.
- Prisma migration deployment workflow.
- Environment variable audit.
- Security hardening.
- Accessibility and browser smoke checks.
- Final redesign preparation.

## Tasks

- Configure Vercel project settings.
- Configure production environment variables.
- Configure preview environment variables.
- Confirm Neon production branch and development branch.
- Add migration deployment instructions.
- Add production build checks.
- Add security headers and CSP.
- Add rate limiting for sensitive routes/actions where needed.
- Audit Auth.js callback URLs and OAuth settings.
- Audit error handling and logging.
- Run accessibility checks on core flows.
- Create redesign task list before launch.

## Tests

- Run full test suite.
- Run lint.
- Run type check.
- Run production build.
- Run Prisma migration status/deploy checks against the intended database branch.
- Run browser smoke checks on the deployed preview.

## App Flow Check

- Open deployed preview.
- Sign in with Google.
- Create, edit, and delete a log.
- Create, edit, and delete an exercise.
- Create, edit, and delete a weightlifting session.
- Create, edit, and delete a pace session.
- Confirm charts render.
- Sign out.
- Confirm protected routes are blocked.
- Confirm no severe browser console errors.

## Acceptance Criteria

- The app deploys successfully to Vercel.
- Production database settings are separated from development settings.
- Prisma migrations can be deployed repeatably.
- Auth callback URLs work in deployed environments.
- Core flows pass in the deployed preview.
- A separate redesign checklist exists before launch.

## Out Of Scope

- The full final redesign itself.
- Native mobile app.
- Public API.

## Notes

Do not connect local development directly to production. Use the Neon development branch for local work and reserve production for deployed production traffic.

Setup for Neon, Google OAuth, and Vercel is still pending until credentials and project resources are created.
