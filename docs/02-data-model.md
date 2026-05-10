# Data Model

This is the initial PostgreSQL model proposal. It intentionally improves on the MongoDB shape instead of copying it directly.

## Entities

### User

Represents an account owner.

Fields:

- `id`
- `name`
- `email`
- `image`
- Auth.js adapter fields and relations
- `role`
- timestamps

Use the Auth.js Prisma Adapter models for users, OAuth accounts, sessions, and verification tokens. Workout records should relate to the adapter `User` model.

### Log

A user-owned training log.

Fields:

- `id`
- `userId`
- `title`
- `slug`
- timestamps

Constraints:

- Unique `userId + slug`

### Exercise

A user-owned exercise inside a log.

Fields:

- `id`
- `userId`
- `logId`
- `title`
- `slug`
- `sessionKind`: `WEIGHTLIFTING` or `PACE`
- timestamps

Constraints:

- Unique `logId + slug`

### WeightliftingSession

A dated strength session for an exercise.

Fields:

- `id`
- `userId`
- `logId`
- `exerciseId`
- `performedAt`
- `totalVolume`
- `junkVolume`
- `workingVolume`
- timestamps

Notes:

- Route by `id` or by `performedAt + id`, not by globally unique date slug.
- Volumes are calculated from sets on the server.

### WeightliftingSet

A set inside a weightlifting session.

Fields:

- `id`
- `sessionId`
- `position`
- `repetitions`
- `kilograms`
- `isHard`
- `volume`

Constraints:

- Unique `sessionId + position`

### PaceSession

A dated pace/speed session for an exercise.

Fields:

- `id`
- `userId`
- `logId`
- `exerciseId`
- `performedAt`
- `hours`
- `minutes`
- `seconds`
- `distance`
- `pace`
- `paceMinutes`
- `paceSeconds`
- `speed`
- timestamps

Notes:

- Distance should keep the existing unit unless changed. The old UI appears to treat it as kilometers.
- Pace and speed are calculated server-side from time and distance.

## Prisma Sketch

This is not the final schema file, but it captures the intended relationships.

```prisma
enum Role {
  USER
  ADMIN
}

enum SessionKind {
  WEIGHTLIFTING
  PACE
}

model User {
  id        String   @id @default(cuid())
  name      String?
  email     String   @unique
  role      Role     @default(USER)
  logs      Log[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Log {
  id        String     @id @default(cuid())
  userId    String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  slug      String
  exercises Exercise[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@unique([userId, slug])
  @@index([userId, updatedAt])
}

model Exercise {
  id                    String                 @id @default(cuid())
  userId                String
  logId                 String
  log                   Log                    @relation(fields: [logId], references: [id], onDelete: Cascade)
  title                 String
  slug                  String
  sessionKind           SessionKind
  weightliftingSessions WeightliftingSession[]
  paceSessions          PaceSession[]
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt

  @@unique([logId, slug])
  @@index([userId, logId])
}

model WeightliftingSession {
  id            String             @id @default(cuid())
  userId        String
  logId         String
  exerciseId    String
  exercise      Exercise           @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
  performedAt   DateTime
  totalVolume   Decimal            @default(0)
  junkVolume    Decimal            @default(0)
  workingVolume Decimal            @default(0)
  sets          WeightliftingSet[]
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  @@index([userId, exerciseId, performedAt])
}

model WeightliftingSet {
  id          String               @id @default(cuid())
  sessionId   String
  session     WeightliftingSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  position    Int
  repetitions Decimal
  kilograms   Decimal
  isHard      Boolean              @default(false)
  volume      Decimal

  @@unique([sessionId, position])
}

model PaceSession {
  id          String   @id @default(cuid())
  userId      String
  logId       String
  exerciseId  String
  exercise    Exercise @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
  performedAt DateTime
  hours       Int      @default(0)
  minutes     Int      @default(0)
  seconds     Int      @default(0)
  distance    Decimal  @default(0)
  pace        Decimal  @default(0)
  paceMinutes Int      @default(0)
  paceSeconds Int      @default(0)
  speed       Decimal  @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, exerciseId, performedAt])
}
```

## Derived Metric Rules

Weightlifting:

- Set volume: `repetitions * kilograms`
- Total volume: sum of all set volumes
- Working volume: sum of volumes where `isHard` is true
- Junk volume: sum of volumes where `isHard` is false

Pace:

- Total minutes: `hours * 60 + minutes + seconds / 60`
- Pace: `totalMinutes / distance`, or `0` when distance is zero
- Pace minutes: integer minutes from pace
- Pace seconds: fractional pace converted to seconds
- Speed: `distance / totalMinutes`, or `0` when total time is zero

## Open Modeling Questions

- Should weightlifting sets allow decimal repetitions, or should repetitions be integer-only?
- Should derived metrics be stored for sorting/reporting, computed at read time, or both?

## Modeling Decisions

- Users can have multiple sessions for the same exercise on the same date.
- Distance uses kilometers in v1.
- Weight uses kilograms in v1.
- Log and exercise slugs are scoped and can update when titles change.
- Session routes use ids instead of date slugs.
- Keep an `ADMIN` role in the user model, but do not build admin UI in v1.
