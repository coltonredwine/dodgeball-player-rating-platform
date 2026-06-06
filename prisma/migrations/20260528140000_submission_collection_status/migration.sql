-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('not_collected', 'collected', 'partially_collected');

-- AlterTable
ALTER TABLE "RatingSubmission"
ADD COLUMN "collectionStatus" "CollectionStatus" NOT NULL DEFAULT 'not_collected',
ADD COLUMN "collectionStatusAt" TIMESTAMP(3),
ADD COLUMN "collectedActivePlayerCount" INTEGER;
