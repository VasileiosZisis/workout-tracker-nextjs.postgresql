-- AlterTable
ALTER TABLE "User" ADD COLUMN "demoExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_demoExpiresAt_idx" ON "User"("demoExpiresAt");
