-- CreateTable
CREATE TABLE "PaceSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "hours" INTEGER NOT NULL DEFAULT 0,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "distance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pace" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "paceMinutes" INTEGER NOT NULL DEFAULT 0,
    "paceSeconds" INTEGER NOT NULL DEFAULT 0,
    "speed" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaceSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaceSession_userId_exerciseId_performedAt_idx" ON "PaceSession"("userId", "exerciseId", "performedAt");

-- CreateIndex
CREATE INDEX "PaceSession_logId_exerciseId_idx" ON "PaceSession"("logId", "exerciseId");

-- AddForeignKey
ALTER TABLE "PaceSession" ADD CONSTRAINT "PaceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaceSession" ADD CONSTRAINT "PaceSession_logId_fkey" FOREIGN KEY ("logId") REFERENCES "Log"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaceSession" ADD CONSTRAINT "PaceSession_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
