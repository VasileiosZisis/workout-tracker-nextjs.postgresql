-- AlterEnum
ALTER TYPE "SessionKind" ADD VALUE 'INTERVAL';

-- CreateTable
CREATE TABLE "IntervalSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "rounds" INTEGER NOT NULL,
    "workSeconds" INTEGER NOT NULL,
    "recoverySeconds" INTEGER NOT NULL,
    "includeFinalRecovery" BOOLEAN NOT NULL DEFAULT false,
    "totalWorkSeconds" INTEGER NOT NULL,
    "totalRecoverySeconds" INTEGER NOT NULL,
    "intervalBlockSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntervalSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntervalSession_userId_exerciseId_performedAt_idx" ON "IntervalSession"("userId", "exerciseId", "performedAt");

-- CreateIndex
CREATE INDEX "IntervalSession_logId_exerciseId_idx" ON "IntervalSession"("logId", "exerciseId");

-- AddForeignKey
ALTER TABLE "IntervalSession" ADD CONSTRAINT "IntervalSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntervalSession" ADD CONSTRAINT "IntervalSession_logId_fkey" FOREIGN KEY ("logId") REFERENCES "Log"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntervalSession" ADD CONSTRAINT "IntervalSession_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
