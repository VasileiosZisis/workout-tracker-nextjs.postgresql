# Workout Trackr

Workout Trackr is a commercial, production-oriented full-stack performance
tracking application built with Next.js, PostgreSQL, and Prisma. It records
structured weightlifting and pace-based training data, calculates derived
metrics on the server, and presents session history as evidence that can guide
future training decisions.

The project is also an engineering case study in modernizing a MERN application
into a server-first Next.js architecture with relational data modeling,
database-backed authentication, explicit validation, and an environment-aware
deployment workflow.

![Workout Trackr exercise progress view](public/home/bench-progress.png)

## Live Demo

[Try the temporary Workout Trackr demo](https://www.workouttrackr.com/demo)
without using a personal sign-in method. Each visitor receives an isolated,
writable workspace with sample strength and running history. Demo data is
permanently deleted after two hours or when the visitor exits the demo.

## Engineering Focus

- Server Components for authenticated, read-heavy application screens.
- Server Actions for application-owned mutations.
- Database-level ownership filters on every user-owned query and mutation.
- Zod validation at server boundaries.
- Server-calculated metrics instead of trusting derived client input.
- Relational constraints and cascading deletes for domain integrity.
- Database-backed Auth.js sessions with Google OAuth and Postmark magic links.
- Isolated, two-hour demo sandboxes with seeded training history.
- Isolated Neon branches for local development, Preview deployments, and
  Production.
- Forward-only Prisma migrations deployed automatically during Vercel builds.
- Focused unit and database integration tests for domain and authorization
  behavior.

## Product Scope

Authenticated users can:

- Organize training into logs and exercises.
- Record weightlifting sessions with ordered sets, repetitions, weight, and
  hard-set classification.
- Record pace sessions with duration and distance.
- Review paginated session history and previous-session evidence.
- Analyze working volume, total volume, junk volume, load per rep, pace, speed,
  and distance.
- Filter progress charts by predefined or custom date ranges.
- Update their profile and securely end database sessions.

## Architecture

```mermaid
flowchart LR
  Browser["Browser"] --> App["Next.js App Router"]
  App --> RSC["React Server Components"]
  App --> Actions["Server Actions"]
  App --> Auth["Auth.js Route Handlers"]
  RSC --> Queries["Feature Query Modules"]
  Actions --> Validation["Zod Validation"]
  Actions --> Domain["Domain Metric Logic"]
  Auth --> Prisma["Prisma Client"]
  Auth --> Postmark["Postmark Transactional Email"]
  Queries --> Prisma
  Domain --> Prisma
  Prisma --> Neon["Neon PostgreSQL"]
  GitHub["GitHub"] --> Vercel["Vercel Builds"]
  Vercel --> NeonBranches["Neon Production / Preview Branches"]
```

The application is organized by responsibility:

- `app/` defines public, authentication, authenticated, and API routes.
- `features/` owns domain schemas, calculations, queries, actions, and focused
  UI.
- `components/` contains reusable application and navigation components.
- `lib/` contains cross-cutting auth, environment, database, redirect, and
  metadata utilities.
- `prisma/` contains the relational schema and forward migrations.

Server Components call query modules directly. Mutations flow through Server
Actions, where the user is authenticated, input is parsed, ownership is checked,
derived values are recalculated, and related writes are committed in a
transaction where necessary. CRUD behavior is not duplicated behind an
application-internal JSON API.

## Technology

| Area | Implementation |
| --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript |
| Database | PostgreSQL hosted on Neon |
| ORM and migrations | Prisma 7 and Prisma Migrate |
| Authentication | Auth.js 5, Prisma Adapter, Google OAuth, Postmark magic links, database sessions |
| Validation | Zod 4 |
| Charts | Recharts 3 |
| Testing | Vitest, Prisma-backed integration tests |
| Deployment | Vercel with Neon branch-per-Preview integration |
| Runtime | Node.js 24 |

## Data Model

The core hierarchy is:

```text
User
└── Log
    └── Exercise (WEIGHTLIFTING or PACE)
        ├── WeightliftingSession
        │   └── WeightliftingSet
        └── PaceSession
```

Auth.js `Account` and `Session` records belong to the same `User` model as the
training data. `VerificationToken` stores single-use email sign-in tokens, while
`AuthRateLimitBucket` stores short-lived HMAC-derived counters without raw email
or IP identifiers. Logs use user-scoped slugs, exercises use log-scoped slugs,
and sessions use stable database identifiers. This avoids cross-user slug
conflicts and same-date session collisions.

Derived metrics are computed on the server. Session aggregates are persisted as
PostgreSQL decimal values, while average working load is calculated from the
stored hard sets:

- Set volume: `repetitions * kilograms`
- Working volume: sum of hard-set volume
- Average working load per rep: hard-set volume divided by hard-set repetitions
  (for one hard set, this equals its recorded weight; sessions without hard
  sets have no value)
- Junk volume: sum of non-hard-set volume
- Pace: elapsed minutes divided by distance
- Speed: distance divided by elapsed time

## Security Model

- Every user-owned Prisma query includes the authenticated user identifier.
- Nested mutations verify ownership of their parent log and exercise.
- Auth.js stores sessions in PostgreSQL and uses secure HTTP-only cookies.
- Callback destinations are restricted to relative application paths.
- Preview deployments disable all configured sign-in providers.
- Email sign-in requests use fixed 15-minute database buckets limited to five
  requests per normalized email and 25 per available client IP.
- Rate-limit identifiers are HMAC-SHA-256 hashes; raw email and IP values are
  not stored in rate-limit records.
- Server errors are logged without form values, credentials, tokens, or database
  connection strings.
- Production responses include CSP, HSTS, framing, MIME-sniffing, referrer,
  permissions, and opener-isolation headers.
- Environment configuration is validated at startup, including minimum secret
  length and Production authentication-provider requirements.

## Development Setup

### Prerequisites

- Node.js 24
- npm
- A Neon PostgreSQL project with a development branch
- A Google OAuth web client for local authentication
- A Postmark server with an active account, verified sender domain, and Server
  API Token when testing email authentication locally

### Installation

```bash
git clone https://github.com/VasileiosZisis/workout-tracker-nextjs.postgresql.git
cd workout-tracker-nextjs.postgresql
npm install
cp .env.example .env
```

Configure `.env` with a pooled Neon development connection in `DATABASE_URL`,
the corresponding unpooled connection in `DIRECT_URL`, a local `AUTH_SECRET`,
and local Google OAuth credentials. To test email sign-in locally, also add
Postmark email credentials. Use a real Postmark Server API Token, not an Account
API Token, SMTP token, or `POSTMARK_API_TEST`.

Create or apply the development migrations, then start the application:

```bash
npm run prisma:migrate
npm run dev
```

The local Google OAuth client should use:

```text
Origin:   http://localhost:3000
Callback: http://localhost:3000/api/auth/callback/google
```

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Stable application origin for local authentication callbacks and Production metadata |
| `AUTH_SECRET` | Environment-specific Auth.js secret of at least 32 characters |
| `AUTH_GOOGLE_ID` | Google OAuth client identifier |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `POSTMARK_SERVER_TOKEN` | Postmark Server API Token used to send passwordless sign-in links |
| `AUTH_EMAIL_FROM` | Verified sender and display name for magic-link emails, such as `Admin <admin@workouttrackr.com>` |
| `DEMO_ENABLED` | Enables anonymous temporary demo creation and the public-header demo link when set to `true`; homepage demo calls to action remain visible in every environment |
| `CRON_SECRET` | Secret used to authenticate scheduled demo cleanup |
| `DATABASE_URL` | Pooled PostgreSQL connection used by the application |
| `DIRECT_URL` | Local unpooled connection used by Prisma migrations |
| `DATABASE_URL_UNPOOLED` | Vercel unpooled migration connection supplied by Neon |

Secrets and Production database URLs are never committed. Local, Preview, and
Production environments use separate credentials.

## Quality Checks

The complete local verification pipeline is:

```bash
npm run check
npm run prisma:validate
```

`npm run check` runs ESLint, TypeScript, the Vitest suite, Prisma Client
generation, and an optimized Next.js production build. Tests cover pure metric
logic, validation schemas, slug and pagination helpers, environment policy,
safe redirects, email rate limiting, Postmark diagnostics, ownership-scoped
database queries, and Server Action behavior.

Useful individual commands:

| Command | Purpose |
| --- | --- |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm test` | Run the complete Vitest suite once |
| `npm run build` | Generate Prisma Client and build Next.js |
| `npm run prisma:validate` | Validate the Prisma schema and configuration |
| `npm run prisma:studio` | Inspect the configured development database |

## Deployment Workflow

The repository uses a three-environment database model:

| Environment | Database | Authentication |
| --- | --- | --- |
| Local | Long-lived Neon `development` branch | Local Google OAuth client and optional Postmark Server API Token |
| Preview | Disposable Neon branch created per deployment | All sign-in providers disabled |
| Production | Primary Neon `production` branch | Production Google OAuth client and active Postmark Server API Token |

Temporary demo availability is controlled independently in each environment
with `DEMO_ENABLED`. The public-header demo link follows this setting, while
homepage demo calls to action remain visible regardless of it. When enabled,
`CRON_SECRET` must also be configured.

Feature branches create Vercel Preview deployments and isolated Neon branches.
Merging into the configured production Git branch creates a fresh Production
deployment. The Vercel build runs `prisma migrate deploy` against the
environment's unpooled connection before generating Prisma Client and building
Next.js.

Database migrations are forward-only. Rolling back a Vercel deployment does not
reverse a migration that has already been applied.

## Current Constraints

- Persistent accounts support Google OAuth and passwordless Postmark magic
  links; passwords and passkeys are not implemented. Anonymous demo workspaces
  expire after two hours.
- Weight and distance are stored and displayed in kilograms and kilometers.
- Preview authentication remains intentionally disabled; enabling it requires
  dedicated provider credentials and controlled email delivery.
- External error tracking and automated browser tests are not part of the
  current v1 scope.
- The rewrite intentionally starts with an empty PostgreSQL database; legacy
  MongoDB data migration is out of scope.

## Documentation

- [Project brief](docs/00-project-brief.md)
- [Architecture](docs/01-architecture.md)
- [Data model](docs/02-data-model.md)
- [Routing and Server Actions](docs/03-routing-and-actions.md)
- [Architecture decisions](docs/04-architecture-decisions.md)
- [Delivery history](docs/05-delivery-history.md)
- [Production runbook](docs/06-production-runbook.md)

## License

This public repository is available for portfolio review and technical
evaluation. The software is proprietary and `UNLICENSED`; no permission is
granted to copy, modify, distribute, or use it commercially.
