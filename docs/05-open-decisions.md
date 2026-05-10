# Open Decisions

This file tracks settled decisions, pending setup, and future considerations.

## Decisions Already Made

- UI direction: use a simple, functional design while core features are built; redesign before deployment.
- Deployment target: optimize for Vercel.
- Database provider: use Neon Postgres.
- Auth approach: use Auth.js with Prisma Adapter.
- Auth providers for v1: start with Google OAuth only.
- Local database workflow: pending setup, but use a Neon `development` branch directly for local development.
- Session URLs: use slugs for logs and exercises; use database ids for sessions.
- Slug behavior: update log and exercise slugs when titles change, unless the new slug would collide.
- Units for v1: use kilograms and kilometers.
- Admin for v1: keep an `ADMIN` role in the schema, but do not build admin UI.
- Chart library: use Recharts.

## Setup Still Pending

- Create the Neon project.
- Create Neon `production` and `development` branches.
- Create Google OAuth credentials.
- Configure local `.env`.
- Configure Vercel project and environment variables later.

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
- Use a protected `production` branch for production.
- Use a long-lived `development` branch for local development.
- Point local `.env` to the Neon `development` branch.
- Use temporary Neon branches for preview deployments, migration testing, and CI when useful.
- Use local Docker Postgres only if fully offline development becomes important.
- Consider Neon Local if a localhost-style connection string is useful while still using Neon branches.

Pending setup:

- Neon project and branches still need to be created.

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
- Do a redesign before deployment.

Implementation notes:

- Prioritize layout stability, accessible forms, clear tables, and predictable navigation.
- Avoid spending time on final visual branding during the core rewrite.

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
