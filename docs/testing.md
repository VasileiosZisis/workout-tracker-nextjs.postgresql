# Testing

## Fast development loop

```powershell
npm test
npm run test:watch
npm test -- features/workouts
```

The default `unit` project runs calculation/schema tests, mocked actions, and
rendering tests in parallel with up to four workers. It needs no database service
or application credentials. On a fresh checkout, generate the ignored Prisma
Client/enums once after installing dependencies:

```powershell
npx prisma generate --config prisma.test.config.ts
```

Generation does not connect to PostgreSQL. A unit test that tries to use real
Prisma fails immediately with guidance to mock it or register an integration test.
Existing per-test database mocks continue to work.

## Local integration database

With Docker Desktop running, prepare the dedicated test service:

```powershell
npm run test:db:up
npm run test:db:prepare
npm run test:integration
```

The Compose service uses PostgreSQL 17, bound only to `127.0.0.1:5433`, with database
`workout_tracker_test` and test-only user/password `workout_test`. These defaults
are for this local test service. The named volume persists across `test:db:down`;
run `test:db:prepare` after adding migrations. The ordinary application's database
and Prisma configuration remain unchanged.

To stop the local service:

```powershell
npm run test:db:down
```

If the port is occupied, use an existing dedicated test PostgreSQL instance and
set its connection string as described below, or change the Compose port and
matching override. No Docker service or migration starts automatically during tests.

## Full and focused regression checks

```powershell
npm run test:all
npm run test:all -- features/workouts features/weightlifting features/exercises
npm run test:integration -- features/workouts/entry-exercises.test.ts
npm run check
```

`test:all` runs both projects; `check` includes that full run along with lint,
typecheck, and build. Prepare the test database and Prisma Client first. Integration
files stay serialized because they share one database and exercise lifecycle and
transaction behavior. Unit files can run alongside them without database access.

Older milestone commands using `npm test` previously included integration tests.
Use `test:all` for the equivalent complete regression check now. Existing file and
feature filters are retained; the selected project determines which matching
files run. Performance improvements have not yet been benchmarked.

## Explicit database overrides

Optionally copy `.env.test.example` to `.env.test.local`, then set
`TEST_DATABASE_URL` to a disposable development/test database. A shell-provided
`TEST_DATABASE_URL` takes precedence over the file, followed by the local default.
The same resolver is used by integration tests and `test:db:prepare`, so migrations
and test queries target the same database. Invalid or blank explicit URLs fail
without logging credentials.

Application `.env`, `DATABASE_URL`, `DIRECT_URL`, and Vercel migration URLs are
never fallback sources for integration tests or test migrations. Tests use a
controlled application environment without real OAuth/email credentials. Selecting
a remote database explicitly retains network latency; local PostgreSQL removes
that source of repeated round-trip delay.

## Adding tests

- Add pure or fully mocked tests as ordinary `*.test.ts` / `*.spec.ts` files.
- Name new real-database suites `*.integration.test.ts` / `*.integration.spec.ts`.
  Existing database filenames are classified in `tests/integration-files.ts` to
  preserve current filters and links.
- Keep fixtures scoped to each test's unique user/log, and clean them up through
  the existing cascades. Do not share mutable workout state across tests.
- Use `tests/fixtures/workout.ts` for prerequisite routine data when setup is not
  the behavior under test. Tests of setup/edit actions must still call the real
  actions/services. The fixture retains revision 1, ordered definitions, and the
  first-workout pointer without repeating the full application setup workflow.

Read-only general, security-isolation, and test-coverage reviews completed with no
actionable findings. No scripts, containers, migrations, or benchmarks were
executed during implementation. Verification remains pending.
