# Milestone: Production Readiness

## Goal

Prepare the redesigned app for deployment.

## Scope

- Vercel deployment configuration.
- Neon production and development branch setup.
- Prisma migration deployment workflow.
- Environment variable audit.
- Security hardening.
- Accessibility and browser smoke checks.

## Tasks

- Add repository Vercel settings and a migration-aware build command. Done.
- Validate production and preview environment configuration. Done.
- Confirm Neon production and development branch separation. Done.
- Add migration deployment and recovery instructions. Done.
- Add production build checks. Done.
- Add security headers and a static CSP. Done.
- Audit rate limiting requirements. Done; use Vercel platform protection for v1.
- Harden Auth.js callback URLs and disable preview OAuth. Done.
- Add safe error handling and Vercel Runtime Log metadata. Done.
- Add production metadata, robots rules, and sitemap behavior. Done.
- Bound pagination and preserve chart filters. Done.
- Configure the Vercel project and Neon integration. Manual release step.
- Configure Preview and Production secrets. Manual release step.
- Configure production Google OAuth. Manual release step.
- Run accessibility and deployed browser checks. Manual release step.

## Tests

- Run full test suite.
- Run lint.
- Run type check.
- Run production build.
- Run Prisma migration status/deploy checks against the intended database branch.
- Run browser smoke checks on the deployed preview.

## App Flow Check

- Open the deployed preview homepage and login page.
- Confirm Preview reports that Google sign-in is unavailable.
- Confirm protected routes redirect safely to login.
- Confirm Preview migrations were applied to its disposable Neon branch.
- Open deployed production.
- Sign in with Google and confirm a database session is created.
- Create, edit, and delete a log.
- Create, edit, and delete an exercise.
- Create, edit, and delete a weightlifting session.
- Create, edit, and delete a pace session.
- Confirm charts render.
- Sign out.
- Confirm protected routes are blocked.
- Confirm no severe browser console errors.
- Confirm no severe Vercel Runtime Log errors.

## Acceptance Criteria

- The app deploys successfully to Vercel.
- Production database settings are separated from development settings.
- Prisma migrations can be deployed repeatably.
- Auth callback URLs work in deployed environments.
- Public and protected-route checks pass in Preview.
- Authenticated core flows pass in Production.

## Out Of Scope

- The full final redesign itself.
- Native mobile app.
- Public API.

## Notes

Do not connect local development directly to production. Use the Neon development branch for local work and reserve production for deployed production traffic.

The existing `production` branch is empty and primary. The Neon plan does not
support protected branches, so confirm the selected branch before every manual
migration or database operation. Follow the
[production runbook](../07-production-runbook.md) for external setup and release.
