-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsLog_to_createdAt_idx" ON "SmsLog"("to", "createdAt");
