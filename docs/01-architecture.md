# Architecture

## System Shape

Workout Trackr is a single Next.js App Router application. UI rendering,
authentication endpoints, reads, and mutations live in one deployable unit,
while PostgreSQL remains the durable system of record.

```text
Browser
  -> Next.js layouts and pages
     -> Server Components -> feature queries -> Prisma
     -> Server Actions -> auth + Zod + domain logic -> Prisma
     -> Auth.js Route Handler -> Prisma Adapter -> Prisma
  -> Neon PostgreSQL
```

The application uses the Node.js runtime and is deployed to Vercel. Neon
provides pooled runtime connections and unpooled migration connections.

## Repository Boundaries

```text
app/
  (marketing)/    public homepage
  (auth)/         sign-in experience
  (app)/          authenticated product routes
  api/auth/       Auth.js Route Handler
components/       reusable application UI
features/         domain actions, queries, schemas, metrics, and UI
lib/              auth, database, environment, metadata, and shared policy
prisma/           schema and migrations
```

Feature modules own domain behavior. For example, `features/weightlifting`
contains its Server Actions, Prisma queries, Zod schemas, calculations,
formatters, tests, and interactive form components. Cross-cutting policy stays
in `lib/` rather than being copied across features.

## Read Path

Authenticated layouts call `requireUser()` before rendering application
content. Server Components then call feature query functions directly. Every
query for user-owned data receives `userId` and includes it in the Prisma
filter, including nested log, exercise, and session lookups.

This avoids:

- Fetching broad datasets and filtering them in the browser.
- Maintaining a client data cache for server-owned screens.
- Exposing an internal CRUD API that duplicates the same authorization rules.

Independent reads are started concurrently where practical. Exercise detail
pages fetch paginated history, latest evidence, and progress data in parallel.

## Mutation Path

Application forms call feature-specific Server Actions. Each action follows the
same boundary:

1. Resolve the authenticated user.
2. Parse `FormData` with a Zod schema.
3. Resolve and verify owned parent records.
4. Recalculate slugs or derived metrics on the server.
5. Commit the mutation, using a Prisma transaction for parent/child writes.
6. Revalidate affected routes and redirect or return typed field errors.

Weightlifting session and set writes are transactional. Derived volume, pace,
and speed values are never accepted as authoritative client input.

## Server And Client Components

Server Components are the default. Client Components are limited to behavior
that requires browser state or event handling, including:

- Dynamic weightlifting set fields.
- Recharts visualizations and series toggles.
- Chart range controls.
- Pagination page-size navigation.
- Delete confirmation and pending form controls.
- Mobile navigation and visual reveal behavior.

## Authentication And Authorization

Auth.js uses Google OAuth, the Prisma Adapter, and database sessions. The
Auth.js models share the same `User` record used by the workout domain.

`proxy.ts` redirects anonymous access to `/logs` and `/profile` through `/login`
with a relative callback path. The login page sanitizes callback destinations
again before redirecting. Authentication controls route access; ownership
filters inside query and action modules control data access.

Preview deployments disable Google OAuth by policy. Production and local OAuth
use separate clients and secrets.

## Data And Connection Management

- `DATABASE_URL` is the pooled application connection.
- Local Prisma commands use the unpooled `DIRECT_URL`.
- Vercel Prisma commands use `DATABASE_URL_UNPOOLED` from the Neon integration.
- `lib/db.ts` provides one Prisma Client instance per development process.
- `prisma.config.ts` prevents local and Vercel migration commands from silently
  falling back to the pooled runtime URL.

The environment parser validates required values at startup and applies
environment-specific OAuth rules.

## Errors And Observability

Expected form validation failures return typed field errors. Route-level errors
render generic user-facing fallbacks so database or provider details are not
exposed.

Next.js instrumentation writes structured unhandled-request metadata to Vercel
Runtime Logs. It records the error type, digest, method, request path, and route
context, but does not record form fields, tokens, credentials, or connection
strings.

## Security Controls

- Database-level ownership filters on reads and writes.
- Auth.js CSRF and secure cookie handling.
- Relative-only post-authentication redirects.
- Startup environment validation.
- Static Content Security Policy.
- HSTS, MIME-sniffing, framing, referrer, permissions, and opener-isolation
  headers.
- Non-indexable authenticated and Preview routes.
- Generic production error messages.
- Environment-scoped secrets and isolated databases.

Application-level rate limiting and external error tracking are deferred for
v1. The current OAuth-only CRUD surface relies on Vercel platform protections.

## Deployment Architecture

Feature branches create Vercel Preview deployments. The Neon integration creates
a disposable database branch from the primary Production branch and injects
pooled and unpooled URLs. Merging into the configured production Git branch
starts a separate Production build using Production-scoped credentials.

The Vercel build sequence is:

```text
prisma migrate deploy -> prisma generate -> next build
```

Migrations are forward-only. Application rollback and database recovery are
therefore separate operational procedures.
