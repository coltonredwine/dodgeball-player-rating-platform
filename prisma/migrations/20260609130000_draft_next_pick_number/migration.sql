-- AlterTable
ALTER TABLE "Draft" ADD COLUMN "nextPickNumber" INTEGER NOT NULL DEFAULT 1;

-- Backfill from existing picks
UPDATE "Draft" AS d
SET "nextPickNumber" = COALESCE(
  (SELECT MAX(p."pickNumber") + 1 FROM "DraftPick" AS p WHERE p."draftId" = d.id),
  1
);
