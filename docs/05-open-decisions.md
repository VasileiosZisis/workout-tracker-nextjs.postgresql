# Open Decisions

This file tracks settled decisions, pending setup, and future considerations.

## Decisions Already Made

- UI direction: use a simple, functional design while core features are built; redesign before deployment.
- Deployment target: optimize for Vercel.
- Database provider: use Neon Postgres.
- Auth approach: use Auth.js with Prisma Adapter.
- Auth session strategy: use database sessions.
- Auth providers for v1: start with Google OAuth only.
- Local database workflow: pending setup, but use a Neon `development` branch directly for local development.
- Session URLs: use slugs for logs and exercises; use database ids for sessions.
- Slug behavior: update log and exercise slugs when titles change, unless the new slug would collide.
- Units for v1: use kilograms and kilometers.
- Admin for v1: keep an `ADMIN` role in the schema, but do not build admin UI.
- Chart library: use Recharts.
- Package manager: use npm and commit `package-lock.json`.

## Setup Still Pending

- Import the repository into Vercel and configure environment variables.
- Connect the existing Neon project to Vercel.
- Configure production Google OAuth after the stable Vercel URL is known.
- Run preview and production deployment checks from the production runbook.

## 1. Authentication

Decision:

- Auth.js with Prisma Adapter

Recommended implementation:

- Store Auth.js users, accounts, sessions, and verification tokens in Neon Postgres through Prisma.
- Start with Google OAuth.
- Treat Google as the only login provider for v1.
- Keep the user-owned workout tables related to the Auth.js `User` model.
- Add more providers later if needed.

Open questions:

- Do you still want email/password login later?
- If email/password is added, do you want to keep Cloudflare Turnstile and Postmark?

## 2. Database Hosting

Decision:

- Use Neon Postgres.

Recommended workflow:

- Use one Neon project for the app.
- Use the primary `production` branch only for production deployments.
- Use a long-lived `development` branch for local development.
- Point local `.env` to the Neon `development` branch.
- Use temporary Neon branches for preview deployments, migration testing, and CI when useful.
- Use local Docker Postgres only if fully offline development becomes important.
- Consider Neon Local if a localhost-style connection string is useful while still using Neon branches.
- Enable branch protection later if the Neon plan adds support for it.

Current setup:

- The Neon project has an empty primary `production` branch and a separate
  `development` branch.
- Local `DATABASE_URL` and `DIRECT_URL` point only to `development`.
- The current Neon plan does not support branch protection, so production
  deletion/reset safeguards remain procedural.

## 3. Deployment Target

Decision:

- Optimize for Vercel.

Implementation notes:

- Use Vercel environment variables for production and preview deployments.
- Keep Prisma migrations deployable through CI/CD.
- Consider Neon preview branches for Vercel preview deployments after the core app is stable.

## 4. UI Direction

Decision:

- Use a simple, functional design until the project is feature-complete.
- Use Performance Lab as the final redesign direction, with a light Quantified Self influence in the information architecture.
- Keep the placeholder name `Workout Trackr` until the final naming decision.
- Use dark mode only for the redesign milestone.

Implementation notes:

- Build a mobile-first app UI with bottom navigation.
- Use flat dark surfaces with spacious layouts and strong hierarchy.
- Use bright amber, violet, blue, and lime accents for important numbers, charts, and status cues.
- Prioritize working volume, hard sets, and pace as the most important v1 metrics.
- Aim for Apple Fitness clarity, but darker, flatter, more technical, and more evidence-oriented.
- Avoid glassmorphism, overly compact screens, generic gym-app styling, and marketing-style copy.

## 5. Units

Decision:

- Use kilograms and kilometers for v1.
- Display pace as min/km.
- Display speed as km/h, with km/min only if it is useful as a secondary technical value.

Future consideration:

- Unit switching can be added later.

## 6. URL And Slug Behavior

Decision:

- Logs and exercises use scoped slugs.
- Sessions use database ids in URLs.
- Log and exercise slugs update when titles change, unless the new slug would collide.

Rationale:

- Session ids avoid the old date-slug collision problem.
- Scoped slugs let different users reuse the same log/exercise names.

## 7. Session Frequency

Decision:

- Allow multiple sessions for the same exercise on the same date.

## 8. Admin Functionality

The old app has an `isAdmin` flag, but the visible current feature set is mostly user-owned data.

Decision:

- Keep an `ADMIN` role in the schema.
- Do not build an admin dashboard in v1.

## 9. Charts

Decision:

- Use Recharts.

## 10. Email

Current app uses Postmark.

Decision:

- Email/password is out of scope for v1.
- Transactional auth email is not needed for v1 while Google OAuth is the only login provider.

Future consideration:

- If email/password is added later, use Postmark if the existing account/domain setup is still preferred.
