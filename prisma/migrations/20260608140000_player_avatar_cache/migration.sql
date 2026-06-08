-- AlterTable
ALTER TABLE "Player" ADD COLUMN "avatarImage" BYTEA,
ADD COLUMN "avatarImageContentType" TEXT,
ADD COLUMN "avatarImageFetchedAt" TIMESTAMP(3);
