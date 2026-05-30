-- CreateEnum
CREATE TYPE "RaterRole" AS ENUM ('rater', 'manager', 'admin');

-- AlterTable
ALTER TABLE "Rater" ADD COLUMN "role" "RaterRole" NOT NULL DEFAULT 'rater';

-- Migrate existing isAdmin values: true -> manager, false -> rater
UPDATE "Rater" SET "role" = 'manager' WHERE "isAdmin" = true;

-- DropColumn
ALTER TABLE "Rater" DROP COLUMN "isAdmin";
