-- CreateTable
CREATE TABLE "WeightliftingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "totalVolume" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "junkVolume" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "workingVolume" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeightliftingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightliftingSet" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "repetitions" DECIMAL(8,2) NOT NULL,
    "kilograms" DECIMAL(8,2) NOT NULL,
    "isHard" BOOLEAN NOT NULL DEFAULT false,
    "volume" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "WeightliftingSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeightliftingSession_userId_exerciseId_performedAt_idx" ON "WeightliftingSession"("userId", "exerciseId", "performedAt");

-- CreateIndex
CREATE INDEX "WeightliftingSession_logId_exerciseId_idx" ON "WeightliftingSession"("logId", "exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "WeightliftingSet_sessionId_position_key" ON "WeightliftingSet"("sessionId", "position");

-- AddForeignKey
ALTER TABLE "WeightliftingSession" ADD CONSTRAINT "WeightliftingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightliftingSession" ADD CONSTRAINT "WeightliftingSession_logId_fkey" FOREIGN KEY ("logId") REFERENCES "Log"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightliftingSession" ADD CONSTRAINT "WeightliftingSession_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightliftingSet" ADD CONSTRAINT "WeightliftingSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WeightliftingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
