# Milestone: Auth

## Status

Implemented.

Verification completed:

- Auth.js and Prisma Adapter dependencies are installed.
- Auth.js adapter models were added to Prisma.
- Database sessions are configured.
- Google OAuth provider is configured.
- Auth route handlers are available at `/api/auth/[...nextauth]`.
- Protected app routes are guarded by `proxy.ts`.
- `/logs` and `/profile` redirect anonymous users to `/login`.
- `/api/auth/session` returns `null` when signed out.
- Auth.js Google sign-in POST redirects to Google OAuth.
- Prisma migration `20260517121035_auth_foundation` was created and applied.
- Prisma migration status reports the database is up to date.
- Prisma schema validation passes.
- Vitest smoke test passes.
- ESLint passes.
- TypeScript check passes.
- Production build passes.

Manual verification still needed:

- Complete Google sign-in in a browser.
- Confirm the signed-in user can access `/logs` and `/profile`.
- Confirm a `User`, `Account`, and `Session` record exist in Neon after sign-in.
- Sign out and confirm protected routes are blocked again.

## Goal

Add Auth.js with Prisma Adapter and protect authenticated app routes.

## Scope

- Auth.js configuration.
- Prisma Adapter models.
- Database session strategy.
- Google OAuth provider.
- Google as the only v1 login provider.
- Sign-in and sign-out flow.
- Session helper functions.
- Protected app layout.
- User relation foundation for workout data.

## Tasks

- Add Auth.js and Prisma Adapter dependencies.
- Add Auth.js adapter models to Prisma schema.
- Configure Google OAuth provider.
- Add Auth.js route handlers.
- Add sign-in and sign-out UI.
- Add `auth()` exports and server helpers such as `requireUser()`.
- Add a protected `(app)` layout.
- Add a minimal profile/account page.
- Configure required environment variables in `.env.example`.
- Configure Auth.js to use database sessions.

## Tests

- Test auth helper behavior for authenticated and unauthenticated requests where practical.
- Verify Prisma schema validates after adapter models are added.
- Run lint, type check, and build.

## App Flow Check

- Visit a protected route while signed out.
- Confirm the app redirects or blocks access.
- Sign in with Google.
- Confirm the user can access protected routes.
- Confirm a user record exists in the database.
- Sign out.
- Confirm protected routes are no longer accessible.

## Acceptance Criteria

- Google login works locally.
- Auth.js stores user/auth records through Prisma.
- Protected pages cannot be accessed anonymously.
- Server code can reliably load the current user.
- Workout records can later reference the Auth.js `User` model.

## Out Of Scope

- Email/password login.
- Additional OAuth providers.
- Password reset emails.
- Admin dashboard.
- Final account settings design.

## Notes

If email/password is added later, treat it as a separate auth-hardening task with rate limiting, bot protection, password reset tokens, and email verification.
