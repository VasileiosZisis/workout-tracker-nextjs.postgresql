# Data Model

The authoritative schema is [`prisma/schema.prisma`](../prisma/schema.prisma).
This document explains the domain relationships and the constraints behind
them rather than duplicating the complete Prisma schema.

## Entity Relationships

```text
User
├── Account
├── Session
└── Log
    └── Exercise
        ├── WeightliftingSession
        │   └── WeightliftingSet
        └── PaceSession
```

Workout sessions also store direct `userId` and `logId` references. These
references support ownership-scoped queries and useful indexes without joining
the full hierarchy for every operation. Server Actions resolve the owned parent
records before creating or moving nested data.

## Authentication Models

| Model | Responsibility |
| --- | --- |
| `User` | Authenticated identity, role, profile, and root workout ownership |
| `Account` | Google OAuth account linked through the Auth.js Prisma Adapter |
| `Session` | Revocable database-backed Auth.js session |
| `VerificationToken` | Adapter-compatible token storage for future providers |

Deleting a user cascades through accounts, sessions, logs, exercises, and
workout sessions.

## Workout Models

| Model | Responsibility | Key constraints |
| --- | --- | --- |
| `Log` | User-owned training collection | Unique `(userId, slug)` |
| `Exercise` | Activity inside a log | Unique `(logId, slug)` and fixed session kind |
| `WeightliftingSession` | Dated strength evidence and volume totals | Indexed by owner, exercise, and date |
| `WeightliftingSet` | Ordered repetitions, load, classification, and volume | Unique `(sessionId, position)` |
| `PaceSession` | Dated duration, distance, pace, and speed evidence | Indexed by owner, exercise, and date |

`Exercise.sessionKind` is either `WEIGHTLIFTING` or `PACE`. Query and action
modules include this discriminator when resolving session-specific records.

## Identifier Strategy

- Database records use CUID primary keys.
- Logs use slugs unique within a user.
- Exercises use slugs unique within a log.
- Log and exercise slugs update with title changes when the target slug is
  available.
- Session routes use database identifiers rather than date slugs, allowing
  multiple sessions for the same exercise on the same date.

## Decimal Storage

Measurements and derived values use PostgreSQL decimal columns instead of
binary floating-point storage:

- Repetitions and kilograms: `Decimal(8, 2)`
- Set and session volume: `Decimal(12, 2)`
- Distance: `Decimal(10, 2)`
- Pace and speed: `Decimal(10, 3)`

Domain functions calculate in JavaScript numbers, round at the defined metric
precision, and persist through Prisma decimal fields.

## Derived Metrics

Weightlifting:

```text
setVolume = repetitions * kilograms
totalVolume = sum(all setVolume)
workingVolume = sum(setVolume where isHard = true)
junkVolume = sum(setVolume where isHard = false)
```

Weightlifting values are rounded to two decimal places.

Pace:

```text
totalMinutes = hours * 60 + minutes + seconds / 60
paceMinPerKm = totalMinutes / distance
speedKmPerHour = distance / (totalMinutes / 60)
```

Pace and speed are zero when their divisor is zero and are rounded to three
decimal places. Display helpers expose pace as minutes and seconds per kilometer.

## Ownership And Lifecycle

Prisma relations use cascading deletes for owned child records:

- Deleting a log removes its exercises and sessions.
- Deleting an exercise removes its weightlifting or pace sessions.
- Deleting a weightlifting session removes its sets.
- Deleting a user removes both authentication and workout data.

Database cascades handle lifecycle cleanup; application code does not emulate
relational deletion through post-delete hooks.

## Modeling Tradeoffs

- Derived metrics are stored as well as calculable. This makes progress queries
  and chart mapping simple, at the cost of requiring all writes to use trusted
  domain functions.
- Direct ownership identifiers on nested records improve authorization queries
  but rely on Server Actions to keep parent identifiers consistent.
- Decimal repetitions support partial-repetition data but are more permissive
  than an integer-only strength model.
- The `ADMIN` role is retained for future use; v1 has no administrative UI.
