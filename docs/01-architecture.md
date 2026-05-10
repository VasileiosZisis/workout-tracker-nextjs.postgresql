# Architecture

## Recommended Shape

Use a single Next.js application with the App Router:

```text
app/
  (marketing)/
  (auth)/
  (app)/
  api/
components/
features/
lib/
prisma/
```

Recommended boundaries:

- `app/(marketing)` for public landing/contact pages.
- `app/(auth)` for sign-in, registration, forgot-password, and reset-password screens.
- `app/(app)` for authenticated product routes.
- `features/*` for domain-specific UI, actions, queries, and schemas.
- `lib/auth` for session helpers and authorization checks.
- `lib/db` for the Prisma client singleton.
- `lib/validation` only for shared schema helpers; domain schemas should stay near their feature.

## Next.js Patterns

Use Server Components by default.

Use Client Components for:

- Dynamic form field arrays for weightlifting sets
- Charts
- Optimistic/pending UI
- Toasts or inline client feedback
- Confirm dialogs
- Navigation toggles and menus

Use Server Actions for:

- Creating, editing, and deleting logs
- Creating, editing, and deleting exercises
- Creating, editing, and deleting sessions
- Profile updates
- Password reset request and completion, unless the chosen auth provider owns it

Use Route Handlers for:

- Auth.js handlers, if Auth.js is chosen
- Webhooks from email/auth providers
- Optional JSON API endpoints needed outside the app UI

## Data Access

Server-side reads should call query functions directly from Server Components. Avoid rebuilding RTK Query patterns in the new app unless a screen genuinely needs client-side cache mutation behavior.

Example feature shape:

```text
features/logs/
  actions.ts
  queries.ts
  schema.ts
  components/
```

All query functions that access user-owned data should require an authenticated user id and include it in the Prisma `where` clause.

## Auth Options

Selected auth approach:

- Auth.js with Prisma Adapter.

Initial provider recommendation:

- Add Google OAuth first and use it as the only v1 login provider.
- Add additional OAuth providers only when needed.
- Add credentials/email-password later only if required, because that adds password hashing, reset emails, bot protection, and rate limiting responsibilities.

Keep the auth boundary simple:

- `requireUser()` returns the signed-in user or redirects/throws.
- `requireOwnedLog(logSlugOrId)` verifies ownership and returns the log.
- Similar helpers guard exercises and sessions.

## Validation

Use Zod as the source of truth for server input validation.

Recommended pattern:

- Parse `FormData` or JSON through Zod inside Server Actions and Route Handlers.
- Return field errors in a typed action state.
- Do not trust derived metric inputs from the client.
- Recalculate volume, pace, speed, and slug values server-side.

## Security

Baseline requirements:

- HTTP-only secure session cookies.
- CSRF protection aligned with selected auth approach.
- Cloudflare Turnstile on registration if email/password registration remains.
- Per-user ownership checks in every data query and mutation.
- Rate limiting for auth, registration, forgot-password, and reset-password flows.
- Password reset tokens stored hashed with expiry, if custom password reset remains.
- Content Security Policy configured after final image/email/auth providers are known.

## Deployment

Selected path:

- Vercel for the Next.js app.
- Neon Postgres for the database.
- Prisma Migrate in CI/CD with `prisma migrate deploy`.

Recommended environment model:

- `production`: Neon production branch connected to the Vercel production deployment.
- `development`: long-lived Neon development branch for local development.
- `preview/*`: optional short-lived Neon branches for Vercel preview deployments and migration testing.

Use direct Neon branch connection strings first. Local `.env` should point to the Neon `development` branch. Add Neon Local only if the project benefits from a stable localhost connection while still routing to Neon branches.
