## Token-conscious workflow

Do not read generated, lock, build, dependency, or cache files unless explicitly necessary:

- `package-lock.json`
- `.next/**`
- `node_modules/**`
- generated Prisma client files
- coverage output
- build output

When a task touches a specific feature, inspect only that feature folder, its route files, and directly imported helpers.

## Command restrictions

Do not run npm scripts from `package.json`, including lint, typecheck, test, build, or Prisma scripts.

Do not run commands that may produce long output unless the user explicitly asks.

After making changes, provide a short “Suggested checks” section with the exact commands the user should run manually.

The agent may inspect `package.json` to identify available scripts, but must not execute them.

## Subagent review policy

Project-specific review agents are available under `.codex/agents/`.

Use subagents selectively based on the domains affected by the current change. Do not spawn every subagent for every task.

The agents defined in `.codex/agents/` are reviewers, not primary implementers. The parent agent should implement the change first and use the relevant review agents afterward for independent review. If the user explicitly requests delegated implementation, use a separate implementation agent rather than one of these review roles.

All review subagents must remain read-only.

Subagents must follow the command restrictions in this file. They must not run lint, typecheck, tests, builds, Prisma commands, dev servers, or other npm scripts. An explicit request to a subagent does not override these repository-level restrictions.

### `reviewer`

Use `reviewer` for non-trivial code changes where an independent general review would provide meaningful value.

Typical triggers include:

- multi-file feature work
- non-trivial bug fixes
- refactors that can change behavior
- Server Action changes
- query or persistence changes
- authentication changes
- changes to shared utilities
- changes with meaningful regression risk

The reviewer should focus on:

- correctness bugs
- behavioral regressions
- broken edge cases
- error handling
- data integrity
- security issues
- concurrency or transaction problems
- contract violations
- important missing validation

Do not spawn `reviewer` for trivial copy, formatting, styling, comment, or similarly low-risk changes unless they also alter behavior.

### `training_integrity`

Use `training_integrity` whenever a change affects or could affect workout-domain semantics or derived training metrics.

Typical triggers include:

- weightlifting sessions or sets
- repetitions, kilograms, or set volume
- hard-set classification
- total, working, or junk volume
- average working load
- pace sessions
- duration or distance calculations
- pace or speed
- interval sessions
- rounds, work duration, or recovery duration
- final-recovery behavior
- interval totals or work:rest ratios
- persisted derived metrics
- recalculation of metrics during edits
- exercise `sessionKind`
- history, progress, or chart calculations that interpret training data
- conversions, Decimal handling, or rounding of training measurements

`training_integrity` should verify the domain behavior independently from the implementation approach.

When reporting a calculation problem, it should provide a concrete numerical example demonstrating the incorrect result.

### `security_isolation`

Use `security_isolation` whenever a change affects or could affect authentication, authorization, user-owned data, demo isolation, or another security boundary.

Typical triggers include:

- Prisma reads or mutations involving user-owned data
- Server Actions
- entity lookup by ID or slug
- logs, exercises, sessions, or sets
- nested mutations
- ownership predicates
- direct `userId` or `logId` relationships
- authentication or Auth.js behavior
- Google OAuth
- magic-link authentication
- callback or redirect handling
- session creation or revocation
- demo workspace creation or cleanup
- demo expiration
- rate limiting
- security-sensitive environment policy
- sensitive logging or error handling
- API or cron routes with protected behavior

`security_isolation` should look for concrete reachable failures such as:

- cross-user reads or writes
- IDOR/BOLA vulnerabilities
- missing ownership checks
- inconsistent redundant ownership identifiers
- unsafe nested connections
- open redirects
- demo-to-user or demo-to-demo data leakage
- authentication bypasses
- accidental secret or sensitive-data exposure

Do not report purely theoretical security concerns without a plausible code path.

### `test_auditor`

Use `test_auditor` after non-trivial behavioral changes when regression coverage is relevant.

Typical triggers include:

- new domain behavior
- bug fixes that should remain fixed
- calculation changes
- authorization changes
- persistence changes
- new Server Action behavior
- session-kind behavior
- authentication changes
- demo behavior
- redirects or rate limiting
- edge cases where an existing test may not cover the changed behavior

`test_auditor` must inspect relevant existing tests before recommending new ones.

It should not recommend tests merely to increase coverage.

For each meaningful test gap, it should identify:

1. the behavior that needs protection
2. the regression or failure scenario
3. the existing test file to extend, or an appropriate new test location
4. a concise Arrange / Act / Assert outline

The test auditor must not write or run tests.

### Choosing which subagents to use

Use the smallest useful review set.

Examples:

- UI-only styling or copy change:

  - normally no subagents

- straightforward low-risk implementation:

  - `reviewer` only when independent review is worthwhile

- weightlifting, pace, or interval calculation change:

  - `training_integrity`
  - `test_auditor`
  - add `reviewer` for non-trivial implementation changes

- Prisma/query ownership change:

  - `security_isolation`
  - `reviewer`
  - add `test_auditor` when behavior or authorization coverage changes

- Server Action modifying workout data:

  - `training_integrity` when domain semantics are affected
  - `security_isolation`
  - `reviewer` for non-trivial changes
  - `test_auditor` when meaningful regression coverage is needed

- authentication, demo, callback, or rate-limit change:

  - `security_isolation`
  - `reviewer`
  - `test_auditor` when behavior changes

- substantial feature touching both workout calculations and persistence:

  - `reviewer`
  - `training_integrity`
  - `security_isolation`
  - `test_auditor`

### Review workflow

For relevant non-trivial changes:

1. The parent agent implements the requested change.
2. Determine which review domains were actually affected.
3. Spawn the relevant subagents in parallel when possible.
4. Keep all review agents read-only.
5. Wait for all requested subagents to finish before considering the task complete.
6. The parent agent must independently evaluate every finding.
7. Deduplicate findings reported by multiple agents.
8. Discard findings that are speculative, unsupported, style-only, unrelated to the current change, or based on a misunderstanding of project behavior.
9. Fix valid in-scope findings.
10. If a fix materially changes the area that produced a finding, request a targeted re-review from the relevant specialist when useful.
11. Do not execute verification commands. If the user explicitly requests command execution, run only commands permitted by the command restrictions above.
12. Include the appropriate manual verification commands under “Suggested checks”.

Subagent findings are advisory. The parent agent remains responsible for determining whether a finding is valid and whether a proposed fix is appropriate.

Do not change correct code solely because a subagent suggested an alternative implementation.

Do not create additional scope merely because a reviewer noticed unrelated technical debt.

## Response size

Keep final responses brief.

For normal code changes, respond with only:

1. Files changed
2. What changed
3. Suggested checks

Do not include long explanations, full file contents, or large code excerpts unless the user asks.
