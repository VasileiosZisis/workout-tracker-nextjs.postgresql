# Milestone: Foundation

## Goal

Create the base Next.js application and infrastructure needed for the rewrite.

## Scope

- Next.js App Router with TypeScript.
- Basic route groups.
- Prisma and Neon-ready PostgreSQL configuration.
- Project scripts for development, build, lint, type checking, tests, and Prisma.
- Environment variable examples.
- Simple functional styling baseline.

## Tasks

- Scaffold the Next.js app in this repository.
- Add TypeScript, ESLint, and formatting conventions.
- Add Prisma dependencies and base Prisma configuration.
- Add Neon Postgres environment variables to `.env.example`.
- Add the initial `prisma/schema.prisma`.
- Add `lib/db` Prisma client helper.
- Add route groups for marketing, auth, and app screens.
- Add root layout, basic navigation shell, loading, error, and not-found files.
- Add a simple home page placeholder.
- Add test runner setup.

## Tests

- Run lint.
- Run type check.
- Run app build.
- Run Prisma schema validation.
- Run an initial smoke test.

## App Flow Check

- Start the dev server.
- Open `/`.
- Confirm the page renders.
- Confirm no browser console errors.
- Confirm missing routes show the not-found UI.

## Acceptance Criteria

- The app boots locally.
- The app builds successfully.
- Prisma configuration is ready for a Neon connection string.
- The folder structure supports the planned milestones.
- No auth or domain CRUD is required yet.

## Out Of Scope

- Final visual design.
- Auth implementation.
- Workout domain implementation.
- Production deployment.

## Notes

Keep the UI plain and stable. The project will be redesigned before deployment.
