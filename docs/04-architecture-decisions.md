# Architecture Decisions

This document records the main technical decisions in the current system. These
are implemented decisions rather than an unresolved backlog.

## ADR-001: One Next.js Application

**Status:** Accepted

The product is deployed as one Next.js App Router application. Server Components
perform reads, Server Actions perform application mutations, and Route Handlers
are reserved for Auth.js and future externally consumed HTTP endpoints.

This keeps authorization and domain behavior in one TypeScript codebase. The
tradeoff is tighter coupling to the Next.js runtime and deployment model.

## ADR-002: PostgreSQL And Prisma

**Status:** Accepted

PostgreSQL replaces the legacy document database. Prisma provides the schema,
typed client, and committed migration history.

Relational constraints and cascades make ownership and deletion behavior
explicit. Prisma migrations are forward-only in deployment; rolling back the
application does not roll back the database.

## ADR-003: Neon Branches By Environment

**Status:** Accepted

One Neon project provides:

- A long-lived `development` branch for local work.
- A primary `production` branch for the live application.
- Disposable branches created for Vercel Preview deployments.

Runtime queries use pooled URLs and migrations use unpooled URLs. Production
credentials are scoped to Vercel Production and are not stored locally.

The current Neon plan does not provide branch protection. Production deletion,
reset, restore, and manual SQL operations therefore require procedural branch
and hostname confirmation.

## ADR-004: Auth.js Database Sessions

**Status:** Accepted

Auth.js uses the Prisma Adapter, Google OAuth, and database sessions. Database
sessions support server-side revocation and keep authentication records related
to the same `User` model as workout data.

Google is the only v1 provider. Email/password authentication is deferred
because it would add password hashing, verification, recovery email, bot
protection, and additional rate-limiting responsibilities.

## ADR-005: Preview OAuth Disabled

**Status:** Accepted

Generic Vercel Preview URLs do not receive Google credentials, and application
policy disables Google sign-in whenever `VERCEL_ENV=preview`.

This prevents production credentials from spreading across dynamic deployments.
Authenticated Preview testing would require a long-lived staging branch, a stable
branch URL, a dedicated OAuth client, and an explicit policy change.

## ADR-006: Authorization In Every Data Operation

**Status:** Accepted

Route protection is not treated as sufficient authorization. Query and action
functions require `userId` and include it in Prisma filters. Nested mutations
resolve owned parent records before writing.

This duplicates some ownership predicates but prevents accidental cross-user
access when a helper is called from a new route.

## ADR-007: Server-Owned Derived Metrics

**Status:** Accepted

Volume, pace, and speed are calculated in tested domain functions and persisted
for efficient history and progress queries. Client-submitted derived values are
ignored.

Persisting derived values improves read simplicity but requires all mutation
paths to use the same trusted calculations.

## ADR-008: Scoped Slugs And Session IDs

**Status:** Accepted

Logs use user-scoped slugs, exercises use log-scoped slugs, and sessions use
database IDs. Slugs update with titles when the target value is available.

This supports readable collection URLs without creating cross-user naming
conflicts or same-date session collisions.

## ADR-009: Metric Units For V1

**Status:** Accepted

Weight is stored in kilograms, distance in kilometers, pace in minutes per
kilometer, and speed in kilometers per hour. Unit conversion is deferred until
the product requires user-level preferences.

## ADR-010: Server-First Rendering

**Status:** Accepted

Server Components are the default. Client Components are limited to charts,
dynamic form fields, browser navigation controls, confirmation interactions,
and visual behavior.

This reduces browser-side data synchronization and JavaScript ownership while
retaining client interactivity where it has clear value.

## ADR-011: Platform-Native Production Operations

**Status:** Accepted

Vercel performs builds, hosts functions, applies static security headers, and
provides Runtime Logs. The Neon integration supplies environment-specific
database branches and connection variables.

External error tracking, application-level rate limiting, GitHub Actions, and
automated browser tests are deferred for v1. Their absence is an explicit scope
decision rather than an assumption that they are never needed.

## ADR-012: Mobile-First Performance Lab UI

**Status:** Accepted

The product uses a dark, flat, mobile-first interface with spacious hierarchy
and amber, violet, blue, and lime accents for important metrics. Information
architecture follows a performance-lab direction with quantified-self influence
so the domain can expand beyond workouts.
