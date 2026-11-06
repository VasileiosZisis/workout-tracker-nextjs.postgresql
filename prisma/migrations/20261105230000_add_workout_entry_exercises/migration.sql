ALTER TABLE "WorkoutEntry" ADD COLUMN "exercisePlanRevision" INTEGER;

CREATE TABLE "WorkoutEntryExercise" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "WorkoutEntryExercise_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkoutEntryExercise_entryId_exerciseId_key" ON "WorkoutEntryExercise"("entryId", "exerciseId");
CREATE INDEX "WorkoutEntryExercise_entryId_position_idx" ON "WorkoutEntryExercise"("entryId", "position");
CREATE INDEX "WorkoutEntryExercise_exerciseId_idx" ON "WorkoutEntryExercise"("exerciseId");

ALTER TABLE "WorkoutEntryExercise" ADD CONSTRAINT "WorkoutEntryExercise_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "WorkoutEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutEntryExercise" ADD CONSTRAINT "WorkoutEntryExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
