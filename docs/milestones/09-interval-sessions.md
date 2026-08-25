# Milestone: Interval Sessions

Status: Implemented on 2026-08-25.

## Goal

Add a third exercise session kind for uniform repeated intervals. The feature
will be named `INTERVAL` internally and presented as **Intervals / HIIT** in the
UI. Users will record rounds, work duration, recovery duration, and whether a
final recovery is included; the server will calculate workload totals and the
app will show previous-session evidence, history, and progress charts without
claiming that timing changes alone prove improved performance.

## Product Decisions

- V1 supports one uniform interval block per session. Every round uses the same
  work and recovery durations.
- A session requires 2–999 rounds.
- Work and recovery are entered as minutes and seconds and stored as total
  seconds.
- Work and recovery must each be at least one second.
- Recovery after the final work round is optional per session and is excluded
  by default.
- The work:rest ratio describes one programmed work/recovery pair. It is
  derived for display and charts rather than stored.
- The create page shows the newest record as **Previous session**, matching the
  existing weightlifting and pace flows. Saved detail pages show only the
  selected session.
- Workload charts ship in V1, but there is no combined HIIT score or automatic
  claim that a change represents progress.
- Distance, calories, watts, speed, and other output measurements are deferred.

## Data Model

Extend `SessionKind`:

```prisma
enum SessionKind {
  WEIGHTLIFTING
  PACE
  INTERVAL
}
```

Add `intervalSessions IntervalSession[]` to `User`, `Log`, and `Exercise`, then
add the session model:

```prisma
model IntervalSession {
  id                   String   @id @default(cuid())
  userId               String
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  logId                String
  log                   Log      @relation(fields: [logId], references: [id], onDelete: Cascade)
  exerciseId           String
  exercise              Exercise @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
  performedAt          DateTime
  rounds               Int
  workSeconds          Int
  recoverySeconds      Int
  includeFinalRecovery Boolean  @default(false)
  totalWorkSeconds     Int
  totalRecoverySeconds Int
  intervalBlockSeconds Int
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@index([userId, exerciseId, performedAt])
  @@index([logId, exerciseId])
}
```

Create a forward-only migration named `add_interval_sessions`. Application
actions must resolve the owned interval exercise before creating a session so
the duplicated `userId` and `logId` remain consistent with the parent exercise.

## Derived Metrics

Calculate all persisted totals in a tested server-owned domain function. Never
accept client-submitted totals.

```text
recoveryCount = includeFinalRecovery ? rounds : rounds - 1
totalWorkSeconds = rounds * workSeconds
totalRecoverySeconds = recoveryCount * recoverySeconds
intervalBlockSeconds = totalWorkSeconds + totalRecoverySeconds
numericWorkRestRatio = workSeconds / recoverySeconds
```

Reduce the display ratio using the greatest common divisor. For example,
`30:60` displays as `1:2` and `40:60` displays as `2:3`. The ratio always uses
the per-round durations and is unaffected by the final-recovery setting.

The term **interval block duration** must be used instead of total session
duration because warm-up, cooldown, and time outside the programmed block are
not recorded.

## Ordered Implementation Steps

### 1. Protect Session-Kind Integrity

- Before exposing `INTERVAL`, protect the existing weightlifting and pace
  session kinds from changes that would hide their sessions. Add the interval
  count to the same guard when the interval model is created in Step 2.
- When editing an exercise, count its existing session relations.
- If any session exists, disable the session-kind controls, submit the current
  kind through a hidden field, and explain that the type is locked after the
  first session.
- Independently enforce the rule in `updateExerciseAction`: if the submitted
  kind differs and any child session exists, return a `sessionKind` field error.
- Continue allowing title and slug changes while the kind is locked.
- Test both the UI state and a crafted form submission that attempts to bypass
  it.

Before the interval migration, use this read-only audit for the current schema:

```sql
SELECT
  e.id,
  e.title,
  e."sessionKind",
  COUNT(DISTINCT w.id) AS weightlifting_sessions,
  COUNT(DISTINCT p.id) AS pace_sessions
FROM "Exercise" e
LEFT JOIN "WeightliftingSession" w ON w."exerciseId" = e.id
LEFT JOIN "PaceSession" p ON p."exerciseId" = e.id
GROUP BY e.id, e.title, e."sessionKind"
HAVING
  (e."sessionKind" <> 'WEIGHTLIFTING' AND COUNT(DISTINCT w.id) > 0)
  OR (e."sessionKind" <> 'PACE' AND COUNT(DISTINCT p.id) > 0);
```

After the interval migration, expand the read-only audit to all three session
tables:

```sql
SELECT
  e.id,
  e.title,
  e."sessionKind",
  COUNT(DISTINCT w.id) AS weightlifting_sessions,
  COUNT(DISTINCT p.id) AS pace_sessions,
  COUNT(DISTINCT i.id) AS interval_sessions
FROM "Exercise" e
LEFT JOIN "WeightliftingSession" w ON w."exerciseId" = e.id
LEFT JOIN "PaceSession" p ON p."exerciseId" = e.id
LEFT JOIN "IntervalSession" i ON i."exerciseId" = e.id
GROUP BY e.id, e.title, e."sessionKind"
HAVING
  (e."sessionKind" <> 'WEIGHTLIFTING' AND COUNT(DISTINCT w.id) > 0)
  OR (e."sessionKind" <> 'PACE' AND COUNT(DISTINCT p.id) > 0)
  OR (e."sessionKind" <> 'INTERVAL' AND COUNT(DISTINCT i.id) > 0);
```

The audit must return no rows. Do not automatically delete or convert a
mismatch. Stop deployment and repair it from a verified backup; exercises with
sessions in more than one session table require explicit manual review.

### 2. Add Schema, Validation, Metrics, and Formatting

- Add the Prisma enum member, the `INTERVAL: "Intervals / HIIT"` label,
  relations, model, and migration. Complete the owned actions and routes before
  releasing the new session kind to users.
- Create `features/interval` with types, a Zod schema, metric calculations,
  formatters, and unit tests.
- Accept `performedDate`, `rounds`, `workMinutes`, `workSecondsPart`,
  `recoveryMinutes`, `recoverySecondsPart`, and `includeFinalRecovery` from the
  form.
- Require whole numbers; allow minutes from 0–999 and second components from
  0–59; require both combined durations to be positive.
- Convert each minute/second pair to total seconds before calculating totals.
- Add duration formatting that remains readable above 59 minutes and ratio
  formatting based on the greatest common divisor.
- Use the existing UTC date-only parsing and formatting convention.

### 3. Build Owned Queries and Server Actions

- Add ownership-scoped queries for an interval exercise, a paginated session
  page, a session by ID, and the latest session. Keep chart and date-range
  progress queries in step 7.
- Every session query must include `userId`, `exerciseId`, and require the
  parent exercise to have `SessionKind.INTERVAL`. Every mutation must resolve
  an owned interval exercise or session before writing.
- Add `createIntervalSessionAction`, `updateIntervalSessionAction`, and
  `deleteIntervalSessionAction` using the existing not-found, revalidation, and
  redirect patterns.
- Recalculate all totals during create and update. Ignore form fields that
  attempt to submit derived totals or a ratio.
- Order histories by `performedAt`, `createdAt`, and `id`, all descending.

### 4. Add Create, Detail, Edit, and Delete UI

- Add routes beneath the exercise path:

```text
.../interval/new
.../interval/[sessionId]
.../interval/[sessionId]/edit
```

- Build an interval form with date, rounds, work minutes/seconds, recovery
  minutes/seconds, and an **Include recovery after final round** checkbox.
- Default a new session to two rounds, one second of work, one second of
  recovery, and no final recovery.
- On creation, show the newest existing session under **Previous session**
  without calculating deltas.
- Build a reusable summary displaying date, rounds, work per round, recovery per
  round, final-recovery status, total work time, total recovery time, interval
  block duration, and work:rest ratio.
- Add edit and confirmation-based delete flows consistent with the two existing
  session types.
- Keep pages server-first and use client components only for form action state
  and required interactivity.

### 5. Match Existing Previous-Session Evidence

- Match weightlifting and pace by showing the newest existing session only on
  the create page under **Previous session**.
- Keep saved detail pages focused on the selected session. Do not add deltas,
  percentages, comparison tables, or workload verdicts only for intervals.
- Treat any future saved-detail comparison as a cross-session-type feature.

### 6. Integrate Exercise History and Latest Evidence

- Extend the exercise detail page with an interval data branch rather than
  falling through to the generic empty state.
- Add the interval create-session link, empty state, paginated history, and
  links to interval detail pages.
- Use **Latest total work**, **Rounds**, and **Work:rest ratio** in the evidence
  strip.
- Show date, rounds, work per round, recovery per round, and final-recovery
  status on history cards.
- Use “Add a session to start tracking interval workload.” in the empty state.
- Preserve chart range parameters while navigating interval history pages.
- Do not render an interval chart or placeholder until step 7.

### 7. Add Interval Workload Progress

- Add interval progress mapping and ownership-scoped, date-range-aware queries.
- Add an **Interval workload over time** chart with selectors labeled **Total
  work**, **Rounds**, **Block duration**, and **Work:rest ratio**. Select total
  work by default.
- Format duration values for axes and tooltips, use whole numbers for rounds,
  and chart work:rest as a numeric value while retaining the reduced ratio for
  human-readable output. When the ratio is selected, show “Higher values mean
  more programmed work relative to recovery, not better performance.”
- Add an accessible table containing date, rounds, work duration, recovery
  duration, final-recovery status, total work, total recovery, block duration,
  and display ratio.
- Support empty, one-point, same-date, sparse, and multi-point datasets. The
  empty chart state says **No interval data yet**, retains its date-range
  control, and appears above the create-session empty state.

### 8. Update Demo Data and Documentation

- Add **Track Sprints** as an interval exercise in the existing Running demo
  log.
- Seed six dated uniform interval sessions at 70, 56, 42, 28, 14, and 1 day
  before sandbox creation. Use the progressive protocols `6 x 0:20 / 1:00`,
  `8 x 0:20 / 1:00`, `8 x 0:30 / 1:00`, `10 x 0:30 / 1:00` with final
  recovery, `10 x 0:30 / 0:45`, and `12 x 0:30 / 0:45`. Calculate every
  stored total with the shared interval metrics function.
- Keep two demo logs and update the demo expectations to four exercises and six
  interval sessions.
- Populate the configured local development database once by creating or
  reusing **Track Sprints** in the non-demo **Seed Training Log** and upserting
  the same six protocols on UTC dates May 5, 7, 9, 12, 14, and 17, 2026. Use
  deterministic managed IDs, preserve additional user-created sessions, and
  abort for a missing target log or a conflicting non-interval exercise.
- Verify the local transaction is idempotent, the six managed interval rows
  have correct derived totals, and the existing 13 weightlifting and 13 pace
  sessions remain unchanged. This is a one-time development population, not a
  reusable seed framework, and must never target Preview or Production.
- Update the data-model document with the new entity, relations, metrics, and
  lifecycle behavior.
- Update the routing/actions document with the interval routes, actions, and
  queries.
- Update the architecture decisions to include server-owned interval metrics
  and clarify that timing-based workload evidence is not a universal
  performance score.

### 9. Verify the Complete Flow

- Create an interval exercise and confirm the type becomes locked only after
  its first session.
- Create a session without final recovery and verify all derived totals.
- Create a session with final recovery and verify the additional recovery is
  included.
- Confirm the create page says **Previous session** and contains no delta
  claims.
- Confirm saved detail pages show only the selected session.
- Edit a session and confirm metrics, history, and charts update.
- Delete a session and confirm the exercise page remains valid.
- Verify pagination and chart ranges preserve URL state.
- Verify another user and a wrong-kind route cannot access the session.
- Check empty, one-session, and multi-session chart states on desktop and
  mobile.
- Run the mismatch audit and require zero rows before deployment.

## Tests

### Unit Tests

- `10 x 30s / 60s`, without final recovery: work `300`, recovery `540`, block
  `840`, ratio `1:2`.
- The same session with final recovery: work `300`, recovery `600`, block `900`.
- Ratio reduction, including `40:60` to `2:3`.
- Duration conversion and formatting across minute boundaries.
- Minimum and maximum rounds.
- Rejection of one round, zero work, zero recovery, negative values, fractional
  values, minute overflow, and second-component overflow.
- Progress mapping for every chart metric.

### Integration Tests

- Create and update actions persist server-calculated values instead of forged
  submitted totals.
- Session reads and mutations enforce user ownership and interval exercise kind.
- Delete redirects to the owned exercise and cascades correctly.
- Exercise kind changes work before the first session and fail after any session
  exists.
- Pagination, previous-session evidence, latest evidence, and chart queries are
  ownership-scoped.
- Demo creation produces two logs, four exercises, and six interval sessions
  with valid derived totals and exactly one final recovery.
- The one-time local development population adds six deterministic Track
  Sprints sessions without changing the existing weightlifting or pace
  histories and remains idempotent when repeated.

## Acceptance Criteria

- `INTERVAL` is a complete third session kind across schema, exercise creation,
  CRUD routes, history, evidence, charts, demo data, and documentation.
- Existing exercise sessions cannot become hidden through a session-kind edit.
- All interval totals are calculated on the server from validated source
  inputs.
- Final recovery is excluded by default and included only when explicitly
  selected.
- Previous-session evidence matches the existing weightlifting and pace
  behavior; saved detail pages do not add interval-only comparisons.
- Charts and their accessible tables respect ownership and date filters.
- Existing weightlifting and pace behavior remains unchanged.
- The pre-deployment mismatch audit returns no rows.

## Out Of Scope

- Variable timing per round.
- Multiple interval blocks within one session.
- Circuits containing multiple exercises.
- Warm-up, cooldown, and unprogrammed elapsed time.
- Notes, perceived exertion, and heart-rate tracking.
- Distance, calories, watts, speed, or other performance-output measurements.
- A combined HIIT score or automatic performance/progress verdict.
- Automatic conversion or deletion of sessions when changing exercise kind.

## Suggested Verification Commands

These commands must be run manually after implementation:

```text
npm run prisma:validate
npm exec prisma migrate status
npm run lint
npm run typecheck
npm run test
npm run build
```

## Implementation Notes

- Added uniform interval-session schema, server-owned metrics, owned CRUD,
  previous-session evidence, exercise history, workload charts, accessible
  chart data, and Track Sprints seed data.
- Exercise session kinds remain editable while empty and are locked after the
  first weightlifting, pace, or interval session is added.
- Expanded the exercise-action integration coverage so an empty exercise
  cycles through `WEIGHTLIFTING`, `INTERVAL`, and `PACE` before returning to
  `WEIGHTLIFTING`.

## Verification

- `npm run prisma:validate`, `npm exec prisma migrate status`, `npm run lint`,
  `npm run typecheck`, `npm run test`, and `npm run build` completed without
  errors on 2026-08-25.
- The read-only three-table mismatch audit returned zero rows before and after
  browser verification.
- Browser verification confirmed seeded Track Sprints evidence and six-session
  history; empty, create, detail, previous-session, edit, delete, and kind-lock
  flows; server-calculated totals; all four chart metrics; complete tooltips;
  the accessible table; deterministic backdated ordering; two-control
  pagination with preserved custom range parameters; guarded wrong-kind and
  mismatched-parent routes; keyboard operation; and the `390 x 844` layout.
- Browser mutations used a disposable local `Interval Verification` log. Its
  session deletion left the exercise valid, and final cleanup removed the log,
  exercise, and remaining sessions. The persistent Seed Training Log retained
  13 weightlifting, 13 pace, and 6 interval sessions.
- A Brave extension hydration warning caused by its injected
  `cz-shortcut-listen` body attribute was recorded as a browser-environment
  exception; no application-originated severe console errors were observed.
