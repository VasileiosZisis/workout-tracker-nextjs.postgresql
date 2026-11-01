# Milestone: Workout Routines and Scheduling

## Status

The workout changes have been integrated with `main` on `preview`, preserving
interval support, cached session queries, calendar-date validation, and
browser-local date defaults. Verification results below describe the earlier
pre-sync checkout; the integrated code needs fresh manual checks. Stash conflict
resolution did not apply migrations or regenerate the Prisma client.

Task 1 implemented on 2026-11-01 with read-only general, training-integrity,
security-isolation, and test-coverage reviews completed. The requested workouts,
weightlifting, and exercises test run passed: 58 tests across 10 files. Typecheck
also passed after refreshing stale Next.js route types with `next typegen`. Lint,
build, and rendered browser verification remain pending. No migration or Prisma
client-generation commands were run by the agent. Tasks 2-4 are not implemented.

### Task 1 Implementation

- Added one optional continuous routine per log, with 1-30 ordered named workouts,
  inline setup/settings, and a selectable starting workout. Idle edits retain the
  current next workout unless it is removed and a replacement is selected.
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

- Keep the existing Logs, Metrics, and Profile navigation.
- Add an optional workout panel above the exercise list inside a log.
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
- Support creating an optional split, initially suggesting A, B, and C, and
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

1. Create a split inside an existing log and select the next workout.
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
- A new main navigation destination or a redesign of existing session forms.
