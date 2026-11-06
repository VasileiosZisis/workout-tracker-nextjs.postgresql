CREATE TABLE "WorkoutSchedule" (
 "id" TEXT NOT NULL PRIMARY KEY, "routineId" TEXT NOT NULL,
 "style" TEXT NOT NULL CHECK ("style" IN ('CONTINUOUS','WEEKLY','FIXED')),
 "timezone" TEXT NOT NULL, "weekStart" INTEGER NOT NULL CHECK ("weekStart" BETWEEN 0 AND 6),
 "effectiveAt" TIMESTAMP(3) NOT NULL, "startDate" TEXT NOT NULL,
 "endAt" TIMESTAMP(3), "endDate" TEXT, "workouts" JSONB NOT NULL,
 CONSTRAINT "WorkoutSchedule_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "WorkoutRoutine"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "WorkoutSchedule_routineId_effectiveAt_idx" ON "WorkoutSchedule"("routineId", "effectiveAt");
ALTER TABLE "WorkoutEntry" ADD COLUMN "scheduleId" TEXT, ADD COLUMN "slotKey" TEXT,
 ADD COLUMN "plannedName" TEXT, ADD COLUMN "scheduledDate" TIMESTAMP(3),
 ADD COLUMN "schedulingIntent" TEXT NOT NULL DEFAULT 'ROTATION';
ALTER TABLE "WorkoutEntry" ADD CONSTRAINT "WorkoutEntry_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "WorkoutSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "WorkoutSlot" (
 "id" TEXT NOT NULL PRIMARY KEY, "scheduleId" TEXT NOT NULL, "key" TEXT NOT NULL,
 "outcome" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("outcome" IN ('PENDING','SKIPPED','COMPLETED')),
 "originalOutcome" TEXT, "entryId" TEXT,
 CONSTRAINT "WorkoutSlot_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "WorkoutSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "WorkoutSlot_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "WorkoutEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WorkoutSlot_scheduleId_key_key" ON "WorkoutSlot"("scheduleId", "key");
CREATE UNIQUE INDEX "WorkoutSlot_entryId_key" ON "WorkoutSlot"("entryId");
CREATE TABLE "WorkoutScheduleRequest" (
 "id" TEXT NOT NULL PRIMARY KEY, "routineId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "requestId" TEXT NOT NULL, "fingerprint" TEXT NOT NULL, "outcomeDate" TEXT, "name" TEXT, "operation" TEXT, "weekKey" TEXT, "timezone" TEXT,
 CONSTRAINT "WorkoutScheduleRequest_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "WorkoutRoutine"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WorkoutScheduleRequest_userId_requestId_key" ON "WorkoutScheduleRequest"("userId", "requestId");
CREATE INDEX "WorkoutScheduleRequest_routineId_outcomeDate_idx" ON "WorkoutScheduleRequest"("routineId", "outcomeDate");
CREATE INDEX "WorkoutScheduleRequest_routineId_weekKey_idx" ON "WorkoutScheduleRequest"("routineId", "weekKey");
