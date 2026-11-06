BEGIN;

ALTER TABLE "WorkoutEntry" ADD COLUMN "slug" TEXT;

WITH bases AS (
  SELECT "id", "logId", "createdAt",
    COALESCE(NULLIF(lower(trim(both '-' from regexp_replace("name" COLLATE "C", '[^a-zA-Z0-9]+', '-', 'g')) COLLATE "C"), ''), 'workout')
      || '-' || to_char("performedAt", 'YYYY-MM-DD') AS base
  FROM "WorkoutEntry"
), ranked AS (
  SELECT "id", base, row_number() OVER (PARTITION BY "logId", base ORDER BY "createdAt", "id") AS position
  FROM bases
)
UPDATE "WorkoutEntry" AS entry
SET "slug" = ranked.base || CASE WHEN ranked.position = 1 THEN '' ELSE '-' || ranked.position::text END
FROM ranked
WHERE entry."id" = ranked."id";

ALTER TABLE "WorkoutEntry" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "WorkoutEntry_logId_slug_key" ON "WorkoutEntry"("logId", "slug");

COMMIT;
