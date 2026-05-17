-- CreateEnum
CREATE TYPE "SessionKind" AS ENUM ('WEIGHTLIFTING', 'PACE');

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sessionKind" "SessionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exercise_userId_logId_idx" ON "Exercise"("userId", "logId");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_logId_slug_key" ON "Exercise"("logId", "slug");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_logId_fkey" FOREIGN KEY ("logId") REFERENCES "Log"("id") ON DELETE CASCADE ON UPDATE CASCADE;
