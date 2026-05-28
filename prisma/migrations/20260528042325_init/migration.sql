-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('in_progress', 'submitted');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rater" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rater_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RatingSubmission" (
    "id" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'in_progress',
    "submittedAt" TIMESTAMP(3),
    "lastAutosavedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RatingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerRating" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "power" INTEGER,
    "accuracy" INTEGER,
    "intimidation" INTEGER,
    "catching" INTEGER,
    "evasion" INTEGER,
    "nerve" INTEGER,
    "unknownPlayer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Player_lastName_firstName_idx" ON "Player"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "Rater_email_key" ON "Rater"("email");

-- CreateIndex
CREATE INDEX "InviteCode_raterId_expiresAt_idx" ON "InviteCode"("raterId", "expiresAt");

-- CreateIndex
CREATE INDEX "RatingSubmission_status_idx" ON "RatingSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RatingSubmission_raterId_seasonLabel_key" ON "RatingSubmission"("raterId", "seasonLabel");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerRating_submissionId_playerId_key" ON "PlayerRating"("submissionId", "playerId");

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "Rater"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingSubmission" ADD CONSTRAINT "RatingSubmission_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "Rater"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRating" ADD CONSTRAINT "PlayerRating_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "RatingSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRating" ADD CONSTRAINT "PlayerRating_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
