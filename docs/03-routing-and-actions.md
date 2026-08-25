# Routing And Server Actions

## Route Map

### Public And Authentication

| Route | Rendering | Responsibility |
| --- | --- | --- |
| `/` | Static | Product overview and entry point |
| `/demo` | Dynamic | Anonymous sandbox entry; creation requires `DEMO_ENABLED` |
| `/login` | Dynamic | Google and email sign-in or an environment-specific availability notice |
| `/verify-request` | Dynamic | Confirmation after a magic-link email is requested |
| `/api/auth/[...nextauth]` | Route Handler | Auth.js provider, callback, session, and sign-out endpoints |
| `/robots.txt` | Static metadata route | Environment-aware crawler policy |
| `/sitemap.xml` | Static metadata route | Public Production homepage only |

The public header displays its demo link only when `DEMO_ENABLED` is enabled.
Homepage demo calls to action remain visible across environments, while
`DEMO_ENABLED` gates anonymous sandbox creation on `/demo`.

### Authenticated Application

| Route | Responsibility |
| --- | --- |
| `/logs` | Paginated owned logs |
| `/logs/new` | Create a log |
| `/logs/[logSlug]` | Owned log and its exercises |
| `/logs/[logSlug]/edit` | Edit or delete a log |
| `/logs/[logSlug]/exercises/new` | Create an exercise |
| `/logs/[logSlug]/exercises/[exerciseSlug]` | Evidence, charts, and paginated session history |
| `/logs/[logSlug]/exercises/[exerciseSlug]/edit` | Edit or delete an exercise |
| `.../weightlifting/new` | Create a weightlifting session |
| `.../weightlifting/[sessionId]` | View a weightlifting session |
| `.../weightlifting/[sessionId]/edit` | Edit or delete a weightlifting session |
| `.../pace/new` | Create a pace session |
| `.../pace/[sessionId]` | View a pace session |
| `.../pace/[sessionId]/edit` | Edit or delete a pace session |
| `.../interval/new` | Create an interval session |
| `.../interval/[sessionId]` | View an interval session |
| `.../interval/[sessionId]/edit` | Edit or delete an interval session |
| `/profile` | View and update the authenticated profile |

The authenticated route group exports `noindex` metadata and resolves the user
before rendering the app shell. `proxy.ts` provides the early anonymous redirect,
while page queries remain responsible for record ownership.

## Server Actions

The implemented mutation surface is:

```text
createLogAction
updateLogAction
deleteLogAction

createExerciseAction
updateExerciseAction
deleteExerciseAction

createWeightliftingSessionAction
updateWeightliftingSessionAction
deleteWeightliftingSessionAction

createPaceSessionAction
updatePaceSessionAction
deletePaceSessionAction

createIntervalSessionAction
updateIntervalSessionAction
deleteIntervalSessionAction
```

Profile updates use the same authenticated Server Action pattern. Auth.js owns
Google, magic-link, and sign-out mutations.

Actions return field-level validation errors for recoverable form input. Missing
or unowned records use not-found behavior rather than revealing whether another
user owns the identifier. Interval mutations additionally require an owned
`INTERVAL` exercise and recalculate every persisted workload total from the
submitted source fields.

## Query Modules

Feature queries expose narrowly scoped operations instead of generic repository
objects. Examples include:

- Paginated logs and exercises for an explicit user.
- Log and exercise lookup through scoped slugs.
- Session lookup through an explicit user and session identifier.
- Latest-session evidence independent of the active history page.
- Chart data constrained by exercise ownership and date range.
- Interval session reads constrained by user, exercise, and the parent
  `INTERVAL` kind.

Pages call these functions directly from the server. Route Handlers are not used
as an internal transport layer.

The interval feature exposes owned exercise lookup, paginated history, session
detail, and latest-session queries through `getIntervalExerciseBySlug`,
`getIntervalSessionsPage`, `getIntervalSessionById`, and
`getLatestIntervalSession`. `getIntervalProgressData` applies the same owner,
exercise, and kind constraints together with the shared chart date range.

Weightlifting, pace, and interval create pages show the newest existing record
as **Previous session**. Saved detail pages show only the selected session and
do not make comparison or improvement claims.

## Pagination And Chart Filters

List routes accept:

- `page`
- `limit`

Public page-size options are `12`, `24`, and `48`; unsupported values are
normalized and the maximum is `48`. Requested pages are bounded to the available
result set.

Exercise evidence pages additionally accept:

- `chartRange`
- `chartFrom`
- `chartTo`

Pagination and page-size navigation preserve chart filters. Chart range changes
preserve the current URL state. Latest evidence is queried independently so it
always describes the newest session, even while the user views an older history
page. Interval progress supports total work, rounds, interval block duration,
and numeric work:rest ratio while its accessible table retains the reduced
human-readable ratio.

## Cache And Navigation Behavior

- The marketing homepage is statically generated.
- Authenticated pages are rendered on demand because they depend on the session
  and user-owned data.
- Successful Server Actions revalidate affected paths before navigation.
- Creates and deletes redirect to the appropriate owned collection or detail
  route.
- Edits remain slug-aware when a title change produces a new scoped slug.

## Metadata

- Root metadata defines the canonical Production origin and Open Graph basics.
- Preview deployments and authenticated routes are non-indexable.
- Dynamic detail pages generate record-specific titles after ownership checks.
- `robots.txt` disallows API, login, and authenticated paths in Production and
  disallows all crawling in Preview.
