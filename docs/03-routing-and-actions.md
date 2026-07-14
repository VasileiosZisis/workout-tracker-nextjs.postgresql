# Routing And Server Actions

## Route Map

### Public And Authentication

| Route | Rendering | Responsibility |
| --- | --- | --- |
| `/` | Static | Product overview and entry point |
| `/login` | Dynamic | Google sign-in or environment-specific availability notice |
| `/api/auth/[...nextauth]` | Route Handler | Auth.js provider, callback, session, and sign-out endpoints |
| `/robots.txt` | Static metadata route | Environment-aware crawler policy |
| `/sitemap.xml` | Static metadata route | Public Production homepage only |

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
```

Profile updates use the same authenticated Server Action pattern. Auth.js owns
OAuth and sign-out mutations.

Actions return field-level validation errors for recoverable form input. Missing
or unowned records use not-found behavior rather than revealing whether another
user owns the identifier.

## Query Modules

Feature queries expose narrowly scoped operations instead of generic repository
objects. Examples include:

- Paginated logs and exercises for an explicit user.
- Log and exercise lookup through scoped slugs.
- Session lookup through an explicit user and session identifier.
- Latest-session evidence independent of the active history page.
- Chart data constrained by exercise ownership and date range.

Pages call these functions directly from the server. Route Handlers are not used
as an internal transport layer.

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
page.

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
