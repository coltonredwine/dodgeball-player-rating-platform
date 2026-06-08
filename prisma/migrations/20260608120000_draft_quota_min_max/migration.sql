-- Split quotasEnabled into separate minimum and maximum quota toggles.
ALTER TABLE "Draft" ADD COLUMN "minQuotasEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Draft" ADD COLUMN "maxQuotasEnabled" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Draft"
SET
  "minQuotasEnabled" = "quotasEnabled",
  "maxQuotasEnabled" = "quotasEnabled";

ALTER TABLE "Draft" DROP COLUMN "quotasEnabled";
