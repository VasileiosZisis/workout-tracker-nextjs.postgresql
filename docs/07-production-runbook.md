# Production Runbook

## Environment Model

| Environment | Runtime database | Migration database | Google OAuth |
| --- | --- | --- | --- |
| Local | Pooled `development` URL in `DATABASE_URL` | Unpooled `development` URL in `DIRECT_URL` | Development client |
| Preview | Neon integration `DATABASE_URL` | Neon integration `DATABASE_URL_UNPOOLED` | Disabled |
| Production | Neon integration `DATABASE_URL` for `production` | Neon integration `DATABASE_URL_UNPOOLED` for `production` | Production client |

Never place production connection strings in `.env`, source control, issue
comments, build logs, or chat messages.

## Neon Setup

The existing primary `production` branch is the production database and the
parent for disposable preview branches. The `development` branch remains the
only local-development target.

Before connecting Vercel:

1. Confirm `production` is selected in Neon.
2. Confirm `production` contains no users, logs, exercises, or sessions.
3. Confirm `production` is the project default/primary branch.
4. Confirm local `.env` URLs still point to `development`.
5. Do not run `prisma migrate reset`, `prisma db push`, seed commands, or manual
   experiment SQL against `production`.

Before every manual migration command, confirm the Neon project, selected
branch, database name, and hostname. Local Prisma commands require `DIRECT_URL`
and must resolve to `development`; Vercel Prisma commands require
`DATABASE_URL_UNPOOLED` and are scoped by the deployment environment.

The current Neon plan does not support protected branches. Treat deleting,
resetting, restoring, or manually editing `production` as a production change
that requires checking the project, branch, database, and hostname first.

## Vercel And Neon Integration

1. Import the GitHub repository into Vercel.
2. Keep the framework preset as Next.js and Node.js at `24.x`.
3. Install Neon's native Vercel integration for the existing Neon project.
4. Connect `production` to the Vercel Production environment.
5. Enable a Neon branch per Vercel Preview deployment, sourced from
   `production`.
6. Enable both `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in the integration.
7. Confirm a Preview deployment receives preview-branch URLs before allowing
   its build to run migrations.

Vercel uses `npm run build:vercel`. It applies committed migrations to the
deployment's unpooled URL, generates Prisma Client, and builds Next.js. A failed
application build does not reverse a migration that already succeeded.

## Vercel Environment Variables

Preview:

- `AUTH_SECRET`: preview-specific random value of at least 32 characters.
- `DATABASE_URL`: supplied by Neon integration.
- `DATABASE_URL_UNPOOLED`: supplied by Neon integration.
- Do not add Google OAuth credentials or `NEXT_PUBLIC_APP_URL`.

Production:

- `AUTH_SECRET`: production-specific random value of at least 32 characters.
- `AUTH_GOOGLE_ID`: production Google OAuth client id.
- `AUTH_GOOGLE_SECRET`: production Google OAuth client secret.
- `NEXT_PUBLIC_APP_URL`: stable `https://<project>.vercel.app` URL.
- `DATABASE_URL`: supplied by Neon integration.
- `DATABASE_URL_UNPOOLED`: supplied by Neon integration.

`AUTH_URL` is not required. Auth.js infers the host on Vercel.

## Google OAuth

Create a production OAuth client separate from local development. Configure:

- Authorized JavaScript origin: `https://<project>.vercel.app`
- Authorized redirect URI:
  `https://<project>.vercel.app/api/auth/callback/google`

Preview Google sign-in is intentionally disabled because preview URLs are
dynamic.

## Release Sequence

1. Run the repository checks listed in Milestone 8.
2. Push the release commit and inspect the Vercel Preview build.
3. Confirm the Preview build applied all migrations to its disposable branch.
4. Check the Preview homepage, login notice, protected-route redirect, headers,
   browser console, and Vercel Runtime Logs.
5. Reconfirm the Neon `production` branch is selected and empty.
6. Deploy to Vercel Production.
7. Confirm the production migration step completed before the Next.js build.
8. Run the full production flow check from Milestone 8.

## Recovery

- Application failure: roll back to the previous Vercel deployment, then create
  a forward fix for any migration already applied.
- Failed migration: stop deployment, inspect Vercel build logs and Neon branch
  state, then use Prisma migration resolution only after identifying whether the
  SQL was partially applied.
- Database issue: use Neon's restore/branch recovery tools to create a recovery
  branch first. Verify it before changing the primary branch.
- Credential exposure: rotate the affected Neon role password, `AUTH_SECRET`, or
  Google secret, then replace the corresponding Vercel environment variable and
  redeploy.

Never delete or reset `production` as a recovery shortcut.
