# Production Runbook

## Environment Model

| Environment | Runtime database | Migration database | Authentication |
| --- | --- | --- | --- |
| Local | Pooled Neon `development` URL in `DATABASE_URL` | Unpooled `development` URL in `DIRECT_URL` | Development Google client |
| Preview | Neon integration `DATABASE_URL` for a disposable branch | Integration `DATABASE_URL_UNPOOLED` | Google OAuth disabled |
| Production | Neon integration `DATABASE_URL` for the primary `production` branch | Integration `DATABASE_URL_UNPOOLED` | Production Google client |

Local, Preview, and Production use separate `AUTH_SECRET` values. Production
connection strings and OAuth secrets are stored only in Vercel Production.
The temporary demo is independently controlled with `DEMO_ENABLED`. Enabling it
also requires a unique `CRON_SECRET` in the same environment.

## Deployment Configuration

The Vercel project uses Node.js 24 and the repository `vercel.json`. Vercel runs:

```text
npm run build:vercel
  -> prisma migrate deploy
  -> prisma generate
  -> next build
```

`prisma.config.ts` selects `DIRECT_URL` locally and
`DATABASE_URL_UNPOOLED` on Vercel. Application queries always use the pooled
`DATABASE_URL` through `lib/db.ts`.

The Neon integration is available to Vercel Preview and Production, not Vercel
Development. It creates database branches for Preview deployments only. The
primary Neon `production` branch remains attached directly to Vercel Production.

Vercel calls `/api/cron/demo-cleanup` daily at 03:00 UTC. The route accepts only
`Authorization: Bearer CRON_SECRET` and removes expired demo users through the
database's cascading relations. Demo creation also removes expired users before
enforcing the active-workspace capacity limit.

## Routine Development And Release

1. Develop locally against the Neon `development` branch.
2. Run focused tests while implementing the change.
3. Run the aggregate repository checks before opening or merging a pull request.
4. Push a non-production Git branch to create a Vercel Preview and disposable
   Neon branch.
5. Verify the Preview build, migrations, public pages, protected redirects,
   headers, browser console, and Runtime Logs.
6. Merge into Vercel's configured production Git branch.
7. Allow Vercel to create a fresh Production build with Production-scoped
   variables and apply pending migrations to Neon `production`.
8. Run the Production smoke checks below.

Do not manually promote the Preview deployment for a database release. A fresh
Production build ensures `prisma migrate deploy` runs with the Production
unpooled URL.

## Schema Change Workflow

Create migrations only against the Neon `development` branch:

```bash
npm run prisma:migrate
npm run prisma:validate
npm run check
```

Review and commit the generated migration directory with the schema change.
Preview and Production builds apply committed migrations through
`prisma migrate deploy`.

Do not use `prisma db push` as a deployment mechanism. Do not use
`prisma migrate reset`, seed commands, or experimental SQL against Production.

## Preview Verification

Preview authentication is intentionally disabled. Verify:

- The build used a disposable Neon branch.
- All committed migrations were applied to that branch.
- `/` and `/login` render successfully.
- `/login` explains that authentication is unavailable.
- `/logs` and `/profile` redirect safely to login.
- Security headers are present.
- The browser console and Vercel Runtime Logs contain no severe errors.

Authenticated CRUD is tested locally before merge and through a short Production
smoke check after deployment. A future authenticated staging environment requires
a stable branch URL and dedicated OAuth client.

## Production Smoke Check

After each Production deployment:

1. Confirm the Vercel build applied migrations before the Next.js build.
2. Sign in with Google and confirm the database session is accepted.
3. Open logs, profile, and at least one representative exercise.
4. For a domain-changing release, exercise the affected create/edit/delete flow.
5. Confirm latest evidence, charts, filters, and pagination still agree.
6. Sign out and confirm protected routes reject the anonymous request.
7. Open `/demo`, create a sandbox, exercise one mutation, and exit the demo.
8. Confirm the demo user and its related data were cascade-deleted.
9. Inspect the browser console and Vercel Runtime Logs.
10. Confirm created records appear only on the Neon `production` branch.

## Database Safety

The current Neon plan does not provide protected branches. Before any manual
database or migration operation, confirm:

- Neon project
- selected branch
- database name
- role
- hostname
- expected environment

Local `.env` must always resolve to `development`. Production URLs must not be
copied into local files, issue comments, build output, or documentation.

Treat branch deletion, reset, restore, and manual Production SQL as production
changes requiring explicit confirmation. Prefer a recovery branch over modifying
the primary branch during investigation.

## Recovery

### Application Failure

Roll back to the previous Vercel deployment. If the failed release already
applied a migration, create a forward-compatible application fix; application
rollback does not reverse database changes.

### Failed Migration

Stop the release and inspect the Vercel build output and Neon branch state.
Determine whether the SQL was not applied, fully applied, or partially applied
before using Prisma migration resolution. Do not repeatedly redeploy an unknown
migration state.

### Database Incident

Use Neon restore or branching tools to create a recovery branch first. Validate
the recovered data and application behavior before changing the primary branch
or Vercel connection.

### Credential Exposure

Rotate the affected Neon role password, Auth.js secret, or Google client secret.
Replace the corresponding narrowly scoped Vercel variable and redeploy. A rotated
`AUTH_SECRET` invalidates existing sessions.

Never delete or reset the primary Production branch as a recovery shortcut.
