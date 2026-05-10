# Routing And Actions

## Public Routes

| Current React route | Proposed Next.js route | Notes |
| --- | --- | --- |
| `/` | `/` | Landing page. Redirect signed-in users to `/logs`. |
| `/contact` | `/contact` | Keep if still useful. |
| `/login` | `/login` or `/sign-in` | Depends on auth choice. |
| `/register` | `/register` or `/sign-up` | Depends on auth choice. |
| `/forgot-password` | `/forgot-password` | Needed for owned email/password auth. |
| `/reset-password/:token` | `/reset-password/[token]` | Needed for owned email/password auth. |

## Authenticated App Routes

| Current React route | Proposed Next.js route | Primary server work |
| --- | --- | --- |
| `/profile` | `/profile` | Read and update current user. |
| `/logs` | `/logs` | List current user's logs with pagination. |
| `/logs/create-new-log` | `/logs/new` | Create log action. |
| `/logs/:slugLog` | `/logs/[logSlug]` | Show one owned log and paginated exercises. |
| `/logs/edit/:id` | `/logs/[logSlug]/edit` | Edit log action. |
| `/logs/:slugLog/create-new-exercise` | `/logs/[logSlug]/exercises/new` | Create exercise action. |
| `/logs/:slugLog/:slugExercise` | `/logs/[logSlug]/exercises/[exerciseSlug]` | Show exercise, latest session, session list. |
| `/logs/:slugLog/edit/:exerciseId` | `/logs/[logSlug]/exercises/[exerciseSlug]/edit` | Edit exercise action. |
| `/logs/:slugLog/:slugExercise/wl/create-new-session` | `/logs/[logSlug]/exercises/[exerciseSlug]/weightlifting/new` | Create weightlifting session action. |
| `/logs/:slugLog/:slugExercise/wl/:slugSession` | `/logs/[logSlug]/exercises/[exerciseSlug]/weightlifting/[sessionId]` | Show one weightlifting session. |
| `/logs/:slugLog/:slugExercise/wl/edit/:wlsessionId` | `/logs/[logSlug]/exercises/[exerciseSlug]/weightlifting/[sessionId]/edit` | Edit weightlifting session action. |
| `/logs/:slugLog/:slugExercise/pa/create-new-session` | `/logs/[logSlug]/exercises/[exerciseSlug]/pace/new` | Create pace session action. |
| `/logs/:slugLog/:slugExercise/pa/:slugSession` | `/logs/[logSlug]/exercises/[exerciseSlug]/pace/[sessionId]` | Show one pace session. |
| `/logs/:slugLog/:slugExercise/pa/edit/:pasessionId` | `/logs/[logSlug]/exercises/[exerciseSlug]/pace/[sessionId]/edit` | Edit pace session action. |

Routing decisions:

- Logs and exercises use scoped slugs.
- Sessions use database ids to avoid date collisions.
- Log and exercise slugs update when titles change unless the new slug would collide.

## Server Actions

Initial action list:

- `createLog`
- `updateLog`
- `deleteLog`
- `createExercise`
- `updateExercise`
- `deleteExercise`
- `createWeightliftingSession`
- `updateWeightliftingSession`
- `deleteWeightliftingSession`
- `createPaceSession`
- `updatePaceSession`
- `deletePaceSession`
- `updateProfile`
- `requestPasswordReset`, if owned auth is chosen
- `resetPassword`, if owned auth is chosen

Each action should:

- Call `requireUser()`.
- Parse input with Zod.
- Check parent ownership before mutating nested data.
- Use a Prisma transaction when writing parent/child records together.
- Revalidate affected paths.
- Redirect after successful create/delete where appropriate.
- Return field-level errors for validation failures.

## Query Functions

Initial query list:

- `getLogsPage(userId, pagination)`
- `getLogBySlug(userId, logSlug, pagination)`
- `getExerciseBySlug(userId, logSlug, exerciseSlug, pagination)`
- `getWeightliftingSession(userId, sessionId)`
- `getPaceSession(userId, sessionId)`
- `getLatestWeightliftingSession(userId, exerciseId)`
- `getLatestPaceSession(userId, exerciseId)`
- `getCurrentUserProfile(userId)`

## API Route Handlers

Avoid duplicating CRUD as JSON endpoints unless needed. Add route handlers only for:

- Auth provider handlers
- Webhooks
- External integrations
- Future public API needs

## Pagination

Use query params:

- `page`
- `limit`

Recommended defaults:

- Default limit: `12`
- Maximum limit: `100`
- Invalid values clamp to safe values

Server queries should return:

- `items`
- `page`
- `limit`
- `totalItems`
- `totalPages`

## Metadata

Use Next.js metadata APIs instead of `react-helmet-async`.

Suggested metadata:

- Static metadata for landing/contact/auth routes
- Dynamic titles for logs, exercises, and sessions
- Open Graph image reuse from the old Cloudinary assets unless new branding is created
