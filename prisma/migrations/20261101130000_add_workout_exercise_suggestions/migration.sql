-- Intentionally empty of seed/backfill statements: learn only from new sessions.
CREATE TABLE "WorkoutExercise" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "definitionId" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "WorkoutExercise_definitionId_fkey" FOREIGN KEY ("definitionId")
    REFERENCES "WorkoutDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId")
    REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WorkoutExercise_definitionId_exerciseId_key" ON "WorkoutExercise"("definitionId", "exerciseId");
CREATE INDEX "WorkoutExercise_definitionId_position_idx" ON "WorkoutExercise"("definitionId", "position");
