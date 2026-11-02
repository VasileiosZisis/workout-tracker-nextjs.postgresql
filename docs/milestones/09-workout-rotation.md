# Milestone: Workout Routines and Scheduling

## Status

The workout changes have been integrated with `main` on `preview`, preserving
interval support, cached session queries, calendar-date validation, and
browser-local date defaults. Task 2 checks were reported passed by the user on
2026-11-02 after integration. Task 3 checks were also reported passed by the user
on 2026-11-02. Task 4 changes require fresh manual verification.

Task 1 implemented on 2026-11-01 with read-only general, training-integrity,
security-isolation, and test-coverage reviews completed. The requested workouts,
weightlifting, and exercises test run passed: 58 tests across 10 files. Typecheck
also passed after refreshing stale Next.js route types with `next typegen`. Lint,
build, and rendered browser verification remain pending. No migration or Prisma
client-generation commands were run by the agent. Task 2 is implemented with
read-only reviews completed and user-reported checks passed. Task 3 is implemented
with read-only reviews completed and user-reported checks passed. Task 4 is
implemented with read-only reviews completed; migration application, generated
client updates, automated checks, and desktop/mobile verification remain pending.

### Task 1 Implementation

- Added one optional continuous routine per log, with 1-30 ordered named workouts,
  dedicated setup/settings under Routine, and a selectable starting workout.
  Task 3 also allows explicit next-workout changes while idle.
- Added an active-workout panel with recorded-session links, Continue logging,
  Finish, and confirmed Discard. An older active entry must be resolved before a
  new entry starts. Discard preserves recorded sessions as standalone.
- New session forms can join a same-date active workout, explicitly start the next
  workout, or save standalone. Linked session date edits require explicit detach.
- Added additive persistence, a partial unique index guarding active entries,
  log/routine transaction locking, stale-form revisions, and owner-scoped request
  identifiers. Immutable creation fingerprints reject changed-input replays while
  allowing exact retries even after a saved session is edited.
- Preserved server-calculated sets/metrics and existing session redirects. Linked
  exercise session types cannot change until those sessions are detached; session
  and exercise deletion leave workout entries intact without rewinding rotation.
- Added schema, lifecycle, action, ownership, retry/concurrency, cascade, and metric
  regression cases. The targeted suite passed against the configured database
  after allowing 30 seconds for the two longer remote-database integration suites.
- Review findings about changed-input replays and missing regression scenarios
  were fixed and received targeted re-review; no actionable findings remain.

### Suggested Checks

Use the intended development/test database, not production. Apply the migration
before generating the client and running the database-backed tests:

The targeted test and typecheck commands below have passed; the other commands
and browser checks remain manual. The initial sandboxed test run could not reach
Neon; the passing run used network access. Stale route types referenced removed
pages; `node node_modules/next/dist/bin/next typegen` refreshed them before the
successful typecheck, without a build or dev server.

```powershell
npm run prisma:validate
npm run prisma:deploy
npm run prisma:generate
npm run test -- features/workouts features/weightlifting features/exercises
npm run lint
npm run typecheck
npm run build
```

Then check the log panel and new/edit session forms at mobile and desktop widths,
including external submit buttons, server validation errors, start from either
entry point, resume after leaving, finish/wraparound, discard confirmation, and
the manual acceptance flow below. No dev server or browser verification was run
during implementation under the repository's command restrictions.

## Goal

Help users track weightlifting routines with different attendance patterns.
Support continuous rotation, a weekly sequence, and workouts assigned to weekdays.
Keep automatic exercise collection in the existing session-logging flow for all
three styles. A three-workout split describes three workout types, not a promise
to train three times every week.

## Scheduling Styles

| Style | Behavior when training is missed | Example |
| --- | --- | --- |
| Continuous rotation (default) | Keep the next workout until completed or explicitly skipped. No weekly reset. | A and B this week; C next week. |
| Weekly sequence | Follow an ordered list on flexible days; reset to A each new week. Unstarted remaining slots expire as missed. | A and B this week; A next week, with C missed. |
| Fixed weekdays | Suggest the workout assigned to the current day. Missed slots do not push later slots forward. | Monday A, Tuesday B, Thursday C, Friday D. Miss Tuesday; Thursday still suggests C. |

The number and names of workout types are configurable; do not hardcode three.
Weekly reset alone does not cover fixed weekdays: a missed Tuesday must not cause
Thursday's workout to become Tuesday's workout.

### Shared Scheduling Rules

- Store a routine timezone and, for weekly styles, a configurable first day of the
  week. Use local calendar dates rather than elapsed 24-hour periods.
- Continuous routines wrap after the last workout. For the initial weekly-sequence
  behavior, completing all slots means the week is complete; extra training is an
  explicit additional workout, not an automatic second weekly cycle.
- Fixed-weekday rest days show the next scheduled date and allow optional extra
  training. A missed slot stays missed unless explicitly made up or corrected.
- Allow explicit Skip, Choose another workout, and Reset to first workout actions.
  Skipping records no exercise session or training volume. Rest days are not misses.
- A workout not yet due is pending; an unstarted fixed-day slot becomes missed
  only after its local scheduled date ends. Weekly-sequence remaining slots become
  missed at the end of their week. Merely opening a screen does not skip a workout.
- Never silently finish or discard an in-progress workout at a date/week boundary.
  Offer resume or end/discard explicitly; preserve saved exercise sessions. If the
  user resumes on a different day, explicitly choose how the new day's sessions
  are grouped rather than bypassing the entry/session date-matching rule.
- Distinguish scheduled date from actual performed date for make-up workouts.
  Completing an older slot must not advance or consume an unrelated current slot.
- Backdated logging and history corrections do not silently move the current
  rotation. Completing a current active entry updates scheduling only once.
- Switching styles, timezone, week start, or weekday assignments applies from an
  explicit effective date. Preserve past entries, misses, and their schedule context;
  resolve any active entry before activating the new schedule.
- A planned slot, its outcome, and the workout actually performed are distinct.
  Support substitutions and extra workouts without falsely marking both slots done.
- Scheduled completion, explicit skipping, and missing a date must be safe under
  retries and concurrency. Do not depend on a daily background job for correctness.

## Proposed UI and Flow

- Add Routine directly after Logs in the sidebar and mobile navigation.
- Use `/routine` to choose a user-owned log and `/routine/[logSlug]` to create or
  configure its routine. Configuration is unavailable while a workout is active.
- Add an optional workout panel above the exercise list inside a log.
- Logs without routines show no setup form. Existing routines keep only workout
  controls and a Manage routine link; setup/settings live on the Routine pages.
- Routine settings include confirmed deletion while idle. Deletion removes the
  routine and workout grouping/history, keeping exercise sessions, sets, and
  metrics as standalone training data. Resolve active workouts first. Stale forms
  cannot delete a replacement routine or one changed since the page loaded.
- Let users name and order their split workouts without building exercise lists
  in a separate menu.
- Show the next workout and a Start action. While active, show recorded exercises,
  Resume, and Finish actions.
- Add an optional workout selector below the date in the existing New Weightlifting
  Session form. Default to the active workout only when the performed date matches.
- Saving a session automatically includes its exercise in the selected workout.
- Keep standalone session logging available.
- Finish explicitly to complete the selected workout and update the applicable
  schedule. Saving an exercise session or leaving the page does not finish it.

## Concepts

- **Split/routine:** workout definitions and a scheduling style belonging to a user
  and log; continuous rotation is the initial implementation.
- **Workout definition:** a named step such as A / Push, with remembered exercises.
- **Workout entry:** an actual workout on a performed date, with an in-progress or
  completed status and links to recorded exercise sessions.
- **Scheduled slot (weekly styles):** an expected occurrence with a week or local
  scheduled date and a pending, completed, skipped, or missed outcome. This is not
  an exercise session and does not contribute training volume.

Keep definitions separate from performed entries. Changing suggestions or names
must preserve an intelligible history of completed workouts. Existing exercise
sessions remain the source of sets and training metrics; avoid copying their data
into a second set of training records.

## Task 1: Workout Grouping and Continuous Rotation

Deliver a usable feature within the existing logging flow.

- Add persistence and a migration for splits, ordered workouts, workout entries,
  and optional links from weightlifting sessions.
- Support creating an optional split with one blank workout-name field by default, and
  selecting the starting step for users already midway through a rotation. Allow
  a configurable number of steps and keep the data model extensible to Task 4.
- Add the log panel and workout selector to the existing session form.
- Support start, resume, and explicit finish. Allow a workout with recorded
  sessions to finish even when some intended exercises were omitted.
- Preserve standalone sessions and all existing training metric calculations.
- Save the session and its workout association atomically.
- Make repeated Start and Finish submissions safe. Concurrent requests must not
  create duplicate active entries or advance the rotation twice.
- Validate every association against the signed-in user, log, exercise, workout,
  and matching performed date, including demo ownership boundaries.
- Define safe handling for edits, date changes, and deletions of linked sessions
  in this task; do not leave invalid relationships until Task 3.

### Acceptance Criteria

- Logging exercises through the current forms populates the selected workout
  without a separate exercise-list maintenance step.
- A user can leave and resume an active workout with its saved sessions intact.
- Finishing C makes A next; elapsed time and week boundaries do not change that.
- A backdated session is not silently attached to today's active workout.
- Old sessions and standalone logging continue to work.
- Existing volume calculations and exercise progress remain correct, without
  double-counting sessions linked to a workout.
- Retry, concurrency, and ownership cases have meaningful regression coverage.

## Task 2: Remembered Exercises and Logging Shortcuts

Depends on Task 1.

Status: Implemented on 2026-11-01. General, security-isolation, training-integrity,
and test-coverage reviews completed. All checks were reported passed by the user
on 2026-11-02. The agent did not execute the Task 2 migration or checks.

### Implementation Decisions

- Learn immediately from new linked weightlifting session creations only. No
  backfill from old entries, standalone sessions, edits, or request replays.
- Store ordered, deduplicated exercise suggestions per workout definition.
  Retain them after omission, discard, session deletion, and detachment. An
  explicit removal stays removed until a genuinely new linked session is saved.
- Add suggestions atomically with sessions/sets under existing log/routine locks.
  Increase routine revisions when lists change and reject stale list edits.
- Active-workout panels show ordered shortcuts, recorded status, and session
  links, including saved sessions outside the current suggestion list.
- Shortcuts validate an owned active entry in the same log and prefill its date.
  Generic session creation keeps browser-local date defaults.
- Manage suggestions independently under Routine settings while idle, with
  exact-permutation ordering validation and explicit removal that keeps history.
- Cascade suggestions on exercise/routine deletion. Reflect exercise renames and
  remove suggestions when a session-free exercise changes away from weightlifting.
- Recheck all session counts inside the locked exercise edit transaction so a
  concurrent standalone weightlifting save cannot bypass the session-kind lock.
- Reviews found and resolved the session-kind race and added regression cases for
  rollback, per-definition deduplication, persisted selection context, and rejected
  type changes. The settings form submits IDs/names without suggestion payloads.

### Suggested Checks (Task 2)

Use the intended development/test database. Apply the new migration before
generating the client and running the tests:

```powershell
npm run prisma:validate
npm run prisma:deploy
npm run prisma:generate
npm run test -- features/workouts features/weightlifting features/exercises
npm run typecheck
npm run lint
npm run build
```

On desktop and mobile, log new exercises, finish and rotate back, then use the
remembered shortcuts. Verify old sessions do not seed suggestions, shortcuts use
the active entry's date, and removed/reordered suggestions do not change training
history. Verify omission, discard, edits, deletions, and exact retries keep the
chosen suggestion behavior. No migration/code-generation/check commands or browser
verification were executed for Task 2.

### Scope

- Remember exercises when sessions are saved to a workout.
- Show Log session shortcuts for remembered exercises on subsequent occurrences.
- Show which exercises already have recorded sessions in the active entry.
- Deduplicate exercise suggestions while preserving legitimate multiple sessions
  for the same exercise.
- Allow users to explicitly remove or reorder suggestions.
- Do not remove a suggestion merely because it was omitted once.
- Separate changing future suggestions from editing past workout entries.

### Acceptance Criteria

- The first Workout C teaches the app its exercise list through normal logging.
- The next C offers shortcuts to those exercises using the existing session form.
- Recording a new exercise adds it without manual setup elsewhere.
- Removing a suggestion preserves historical sessions and metrics.

## Task 3: Workout History and Corrections

Depends on Task 1; integrates Task 2 suggestions when available.

Status: Implemented on 2026-11-02. General, security-isolation, training-integrity,
and test-coverage reviews completed. All checks were reported passed by the user
on 2026-11-02. The agent did not execute the Task 3 migration or checks.

### Implementation

- Added a Workout history link on each log, a completed-entry list, paginated
  entry details, and Group existing sessions. Sort by performed date, creation
  time, and ID so same-date entries have deterministic order.
- Preserved recorded workout-name snapshots and archived definitions' history.
  Empty completed entries stay visible; discarded entries are excluded.
- Session details offer a separate Change workout form with paginated same-date
  active/completed candidates, Standalone, and links to inspect candidate entries.
  Updates change only membership, preserving session dates, sets, and metrics.
- Corrections are allowed during active workouts. Moving the last session out
  leaves that workout active and empty; finishing still requires a session.
- Grouping selects up to one page (48 maximum) of same-date standalone sessions
  and creates a completed entry using a current definition's name. This is also
  allowed while another workout is active and does not advance the rotation.
- Added nullable entry request fingerprints in an additive migration. Exact
  retries return the original entry, even after later corrections; changed input
  is rejected. Neither grouping nor reassignment changes exercise suggestions.
- Reuse log/routine transaction locks; validate owned session/entry hierarchies,
  source association, session updatedAt, status, dates, and grouping revisions.
  Revision and association writes roll back together on failure.
- Enabled explicit idle Next workout selection through Routine settings while
  preserving the existing active-workout editing restriction.
- Added service/query, action, route-ownership, retry, rollback, and concurrency
  regressions. Static reviews found no implementation issues; identified coverage
  gaps were addressed and received targeted re-review.

### Suggested Checks (Task 3, User-Reported Passed)

Use the intended development/test database. Apply the new migration before
generating the Prisma client and running checks:

```powershell
npm run prisma:validate
npm run prisma:deploy
npm run prisma:generate
npm run test -- features/workouts features/weightlifting features/exercises
npm run typecheck
npm run lint
npm run build
```

On desktop and mobile, verify history pagination, archived names and empty
entries; group standalone sessions while another workout is active; inspect and
reassign same-date sessions; explicitly change the next workout while idle. Check
that corrections keep sets/metrics and suggestions intact, reject stale forms,
and do not move the rotation. No migration or verification commands were run for
Task 3, and no rendered browser checks were performed.

### Scope

- Show completed workout entries and their recorded exercise sessions within
  the log, including workouts spanning different calendar weeks.
- Support correcting session-to-workout assignments within the same user and log.
- Let users explicitly choose which workout comes next.
- Define correction behavior for completed entries, including empty entries after
  session removal, without silently advancing or rewinding the rotation.
- Keep historical names/order understandable after split changes.

### Acceptance Criteria

- History shows A and B in one week, C and A in the next, and B in a later week.
- Corrections neither duplicate exercise sessions nor alter their training data.
- Changing the next workout is explicit and survives subsequent page loads.
- Changing future suggestions does not rewrite past workout composition.

## Decisions to Settle Before Task 1

The following Task 1 defaults were adopted during planning; weekly scheduling
decisions remain for Task 4.

- **Adopted:** one optional split and at most one active workout per log.
- **Adopted:** weightlifting only for the first release.
- **Adopted:** finish requires at least one recorded session; an empty active
  workout can be discarded without advancing.
- **Adopted:** workout entries have a performed date, rather than grouping by
  session creation time. Multiple workouts on the same date remain distinct.
- **Adopted:** routine logging targets the active entry; adding to a completed
  entry is an explicit correction rather than an automatic default.
- **Adopted:** routine editing is restricted until the active entry is finished or
  discarded. An older-date entry must be resolved before starting another entry.
- **Adopted:** start from either the log panel or the session form; session/entry
  creation from the form is atomic. Changing a linked session date requires an
  explicit Standalone selection.
- **Task 2 proposal:** future suggestions represent all remembered exercises,
  with explicit removal rather than replacing them with the latest workout.

## Task 4: Weekly Sequences and Fixed Weekdays

Depends on Tasks 1 and 3. Include this task in the milestone to support users with
different schedules; Tasks 1-3 alone deliver only the continuous style.

Status: Implemented on 2026-11-02. Read-only general, security-isolation,
training-integrity, and test-coverage reviews completed. Valid findings were fixed
and received targeted re-review. No remaining actionable review findings.
Task 4 migration application, Prisma generation, automated checks, and rendered
desktop/mobile verification remain pending; no verification commands were run.

### Implementation and Defaults

- Routine settings offer continuous rotation, weekly sequence, or fixed weekdays,
  with an explicitly confirmed IANA timezone and week start. New timezone input
  defaults to browser detection; Monday is the initial week start. Fixed weekdays
  support one assignment per day and explicit extras for additional training.
- Immutable schedule snapshots preserve names, definition IDs, timezone, order,
  and assignments. New versions apply today or next week; today starts a new
  weekly list and supersedes its unstarted predecessor. One pending version can
  be replaced/cancelled while idle. Definition edits are blocked while pending.
  Name/order edits on an active weekly style require confirmation and apply today;
  assigned fixed definitions must be unassigned before removal.
- Calendar helpers derive unstarted slots and misses without materializing every
  week or running a background job. Slots are persisted for claims, skips, and
  fulfillment; uniqueness and the existing log/routine locks serialize changes.
  Week/day boundaries use saved timezones, including daylight-saving transitions.
- The log panel offers explicit substitution, extra training, skip, reset, and
  make-ups through Schedule outcomes. Weekly completion never starts a second
  cycle. Fixed rest days show the next scheduled date, including pending versions
  across timezone changes. Skipped slots and missed slots can both be made up.
- Configured rotation starts use the routine's current date; different performed
  dates use Extra workout. Existing unconfigured continuous action contracts retain
  their explicit date behavior. Existing entries remain untouched by the migration.
- Active entries retain their captured slot across boundaries. Finish fulfills it
  once; discard releases its claim while preserving sessions as standalone. Extra
  and historical entries do not move the continuous pointer. Weekly reset confirms
  the natural next-week restart and rejects conflicting pending changes.
- New session forms offer scheduled, make-up, extra, and substitute choices. They
  default to a configured routine's local date, clear start intent on date changes,
  and preserve active-shortcut dates. New linked sessions still teach suggestions,
  including eligible archived definitions used by old scheduled slots.
- Workout history links to bounded, week-addressable Schedule outcomes. Version
  pages and continuous skip/reset receipts are independently paginated. Planned
  and actual names/dates, original skipped/missed outcomes, and superseded slots
  remain visible. Historical grouping optionally fulfills one explicit eligible
  slot; ordinary grouping/corrections never change schedule outcomes or suggestions.
- New owner-scoped immutable request fingerprints protect Start, Skip, Reset,
  and slot-aware historical retries. Settings and starts validate the expected
  version/date across activation boundaries, as well as routine revisions.
- Added calendar, lifecycle, ownership, retry, concurrency, rollback, action, and
  session-route regression coverage. Reviews resolved stale settings, pending-reset
  conflicts, substitutions from session forms, timezone defaults/upcoming dates,
  and outcome pagination. No training metric calculations were changed.

### Suggested Checks (Task 4, Pending)

Use the intended development/test database. The additive migration is
`20261102120000_add_workout_scheduling`; apply it before generating the client:

```powershell
npm run prisma:validate
npm run prisma:deploy
npm run prisma:generate
npm run test -- features/workouts features/weightlifting features/exercises
npm run typecheck
npm run lint
npm run build
```

On desktop and mobile, verify all three styles, week exhaustion, fixed rest days,
skips, substitutions, extras, missed/skipped make-ups, and active workouts crossing
a week boundary. Confirm today/next-week changes, cancellation and stale forms;
try a timezone different from the device timezone and a pending timezone change.
Check both Start entry points, external session submit buttons, planned/actual
history dates, outcome pagination, and explicit historical-slot fulfillment.
Verify session reassignment/deletion preserves completed slot outcomes, suggestions,
sets, and volume. These rendered checks remain pending until actually performed.

- Add scheduling-style selection inside the existing log's routine settings.
- Add timezone, week-start selection, and weekday assignments where relevant.
- Implement the Scheduling Styles and Shared Scheduling Rules above, including
  skip, make-up, extra-workout, rest-day, and boundary behavior.
- Show scheduled date and actual performed date where they differ in history.
- Preserve exercise collection and shortcuts across all scheduling styles.
- Define weekday assignment limits before implementation. Multiple slots per day
  must either be supported with explicit slot selection or rejected clearly; never
  silently merge them. Manual extra workout entries remain available.

### Acceptance Criteria

- Continuous: A/B in one week leads to C next week, even after a long break.
- Weekly sequence: A/B in one week leads to A next week, with remaining slots
  shown as missed. Exhausting the weekly list does not silently start another cycle.
- Fixed weekdays: missing Tuesday B leaves Thursday C as the suggestion; B is
  missed, not moved. No missed workout is recorded on a rest day.
- A scheduled slot can be explicitly skipped or made up without double-counting
  completion or changing unrelated slots.
- Week/date boundaries respect the routine timezone and daylight-saving changes.
- An active workout crossing a boundary remains recoverable with saved data intact.
- Backdated entries, schedule edits, substitutions, and extra workouts preserve
  history and cannot accidentally advance today's schedule.
- Regression review covers all styles, ownership, retries, and concurrent requests.

## Review and Verification

For each behavioral task, follow the repository review policy and use only the
review domains actually affected. Keep review agents read-only. Review workout
semantics, ownership, transactional behavior, and relevant regression coverage.

Manual acceptance flow:

1. Open Routine, choose an existing log, create a split, and select the next workout.
2. Start C, log two exercise sessions through existing forms, leave, and resume.
3. Finish C and confirm A is next, including after a week boundary.
4. Save standalone and backdated sessions and verify their associations.
5. Retry Start/Finish and check concurrent requests do not duplicate advancement.
6. Attempt cross-user and cross-demo workout/session associations.
7. Verify session edits/deletions preserve valid associations and existing metrics.
8. After Task 2, repeat C and use remembered exercise shortcuts.
9. After Task 3, correct an assignment and explicitly change the next workout.
10. After Task 4, verify the continuous, weekly, and fixed-weekday examples above,
    including a missed day, week boundary, rest day, and explicit make-up workout.

The implementing task must provide exact manual verification commands appropriate
to its changes. Follow AGENTS.md command restrictions; do not execute npm scripts
or verification commands during agent work.

## Out of Scope

- Reminders, streaks, external calendar sync, and arbitrary recurring schedules
  such as alternating multi-week calendars. The three scheduling styles above are
  in scope; additional patterns can extend the same model later.
- Automatic workout completion based on inactivity or saved exercise count.
- Automatic classification of old sessions into A, B, and C.
- AI-generated programs, prescribed progression, or a new training metric system.
- A redesign of existing session forms.
