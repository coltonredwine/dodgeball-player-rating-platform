-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "League_slug_key" ON "League"("slug");

-- Seed default league
INSERT INTO "League" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES ('cldefaultstonewall00001', 'Stonewall', 'stonewall', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Player.leagueId
ALTER TABLE "Player" ADD COLUMN "leagueId" TEXT;
UPDATE "Player" SET "leagueId" = 'cldefaultstonewall00001' WHERE "leagueId" IS NULL;
ALTER TABLE "Player" ALTER COLUMN "leagueId" SET NOT NULL;
CREATE INDEX "Player_leagueId_lastName_firstName_idx" ON "Player"("leagueId", "lastName", "firstName");
ALTER TABLE "Player" ADD CONSTRAINT "Player_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rater.leagueId + unique (leagueId, email)
ALTER TABLE "Rater" ADD COLUMN "leagueId" TEXT;
UPDATE "Rater" SET "leagueId" = 'cldefaultstonewall00001' WHERE "leagueId" IS NULL;
ALTER TABLE "Rater" ALTER COLUMN "leagueId" SET NOT NULL;
DROP INDEX IF EXISTS "Rater_email_key";
CREATE UNIQUE INDEX "Rater_leagueId_email_key" ON "Rater"("leagueId", "email");
CREATE INDEX "Rater_leagueId_idx" ON "Rater"("leagueId");
ALTER TABLE "Rater" ADD CONSTRAINT "Rater_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RatingSubmission.leagueId
ALTER TABLE "RatingSubmission" ADD COLUMN "leagueId" TEXT;
UPDATE "RatingSubmission" SET "leagueId" = 'cldefaultstonewall00001' WHERE "leagueId" IS NULL;
ALTER TABLE "RatingSubmission" ALTER COLUMN "leagueId" SET NOT NULL;
CREATE INDEX "RatingSubmission_leagueId_idx" ON "RatingSubmission"("leagueId");
ALTER TABLE "RatingSubmission" ADD CONSTRAINT "RatingSubmission_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Draft.leagueId
ALTER TABLE "Draft" ADD COLUMN "leagueId" TEXT;
UPDATE "Draft" SET "leagueId" = 'cldefaultstonewall00001' WHERE "leagueId" IS NULL;
ALTER TABLE "Draft" ALTER COLUMN "leagueId" SET NOT NULL;
CREATE INDEX "Draft_leagueId_idx" ON "Draft"("leagueId");
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AppSetting: rewrite to composite PK (leagueId, key)
-- Use a temporary PK name so it does not collide with the live AppSetting_pkey.
CREATE TABLE "AppSetting_new" (
    "leagueId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_new_pkey" PRIMARY KEY ("leagueId", "key")
);

INSERT INTO "AppSetting_new" ("leagueId", "key", "value", "updatedAt")
SELECT 'cldefaultstonewall00001', "key", "value", "updatedAt" FROM "AppSetting";

DROP TABLE "AppSetting";
ALTER TABLE "AppSetting_new" RENAME TO "AppSetting";
ALTER INDEX "AppSetting_new_pkey" RENAME TO "AppSetting_pkey";
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
