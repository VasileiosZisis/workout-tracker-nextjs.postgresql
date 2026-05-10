# Project Brief

## Goal

Rewrite the existing MERN workout tracker as a modern full-stack Next.js application backed by PostgreSQL and Prisma.

The rewrite should keep the useful product behavior, replace the Express/Mongoose API with Next.js server-side primitives, and start from an empty database.

## Source App

Source repository:

`C:\Users\gonea\repos\workouttrackr-react-mongo`

Current stack:

- React 18 with Vite
- React Router
- Redux Toolkit Query
- Express
- MongoDB with Mongoose
- JWT auth stored in an HTTP-only cookie
- Joi validation
- Cloudflare Turnstile on registration
- Postmark password reset emails
- Chart.js visualizations

## Existing Feature Inventory

Public pages:

- Landing page
- Contact page
- Login
- Register
- Forgot password
- Reset password

Authenticated pages:

- Profile update
- Logs list with pagination
- Create, edit, view, delete logs
- Create, edit, view, delete exercises inside a log
- Create, edit, view, delete weightlifting sessions
- Create, edit, view, delete pace sessions
- Previous-session preview when creating a new session
- Progress tables and chart-oriented session data

Core domain concepts:

- User
- Log
- Exercise
- Weightlifting session
- Weightlifting set
- Pace session

## Rewrite Goals

- Use server-side authorization for every user-owned query and mutation.
- Replace client-side filtering of another user's data with database-level ownership filters.
- Use Prisma relations and cascading deletes instead of Mongoose post-delete hooks.
- Move all validation to Zod schemas that run on the server.
- Keep client components focused on interactivity only: charts, dynamic field arrays, pending states, dialogs, and menus.
- Prefer Server Actions for app-owned form mutations.
- Keep Route Handlers for auth endpoints, webhooks, and API surfaces that must be called outside the UI.
- Add TypeScript from the start.
- Make the schema easier to evolve than the old document model.

## Non-Goals

- No MongoDB data migration.
- No exact CSS copy of the old UI unless explicitly requested.
- No public multi-user social/feed behavior unless explicitly requested.
- No native mobile app.

## Known Issues To Avoid From The Old App

- Logs are fetched broadly and then filtered in the client; this should be server-side ownership filtering.
- Log, exercise, and session slugs are globally unique; this creates unnecessary naming conflicts across users.
- Session date slugs can collide when multiple sessions share a date.
- Derived fields are mixed into document save hooks; this should be explicit domain logic with tests.
- Controllers repeat nested ownership lookups; this should move into reusable server helpers.
- Some route calculations and pagination logic are fragile and should be replaced with typed query helpers.
