-- AlterTable
ALTER TABLE "Draft" ADD COLUMN "onClockStartedAt" TIMESTAMP(3);

UPDATE "Draft"
SET "onClockStartedAt" = "liveAt"
WHERE "isLive" = true AND "liveAt" IS NOT NULL;
