CREATE TYPE "WorkoutEntryStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'DISCARDED');

CREATE TABLE "WorkoutRoutine" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "logId" TEXT NOT NULL REFERENCES "Log"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "nextDefinitionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "WorkoutRoutine_logId_key" ON "WorkoutRoutine"("logId");
CREATE INDEX "WorkoutRoutine_userId_idx" ON "WorkoutRoutine"("userId");

CREATE TABLE "WorkoutDefinition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "routineId" TEXT NOT NULL REFERENCES "WorkoutRoutine"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "archived" BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX "WorkoutDefinition_routineId_archived_position_idx" ON "WorkoutDefinition"("routineId", "archived", "position");
ALTER TABLE "WorkoutRoutine" ADD CONSTRAINT "WorkoutRoutine_nextDefinitionId_fkey"
  FOREIGN KEY ("nextDefinitionId") REFERENCES "WorkoutDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "WorkoutEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "logId" TEXT NOT NULL REFERENCES "Log"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "routineId" TEXT NOT NULL REFERENCES "WorkoutRoutine"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "definitionId" TEXT NOT NULL REFERENCES "WorkoutDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "performedAt" TIMESTAMP(3) NOT NULL,
  "status" "WorkoutEntryStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "requestId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "WorkoutEntry_userId_requestId_key" ON "WorkoutEntry"("userId", "requestId");
CREATE INDEX "WorkoutEntry_userId_logId_performedAt_idx" ON "WorkoutEntry"("userId", "logId", "performedAt");
CREATE INDEX "WorkoutEntry_routineId_status_idx" ON "WorkoutEntry"("routineId", "status");
CREATE UNIQUE INDEX "WorkoutEntry_one_active_per_routine" ON "WorkoutEntry"("routineId") WHERE "status" = 'IN_PROGRESS';

ALTER TABLE "WeightliftingSession" ADD COLUMN "workoutEntryId" TEXT, ADD COLUMN "requestId" TEXT, ADD COLUMN "requestFingerprint" TEXT;
ALTER TABLE "WeightliftingSession" ADD CONSTRAINT "WeightliftingSession_workoutEntryId_fkey"
  FOREIGN KEY ("workoutEntryId") REFERENCES "WorkoutEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "WeightliftingSession_workoutEntryId_idx" ON "WeightliftingSession"("workoutEntryId");
CREATE UNIQUE INDEX "WeightliftingSession_userId_requestId_key" ON "WeightliftingSession"("userId", "requestId");
