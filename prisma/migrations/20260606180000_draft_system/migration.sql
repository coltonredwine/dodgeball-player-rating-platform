-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('setup', 'in_progress', 'complete');

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'setup',
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "teamCount" INTEGER NOT NULL,
    "rankThresholds" TEXT NOT NULL,
    "quotasEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displaySettings" TEXT NOT NULL DEFAULT '{}',
    "liveAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPlayer" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftTeam" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "pickOrder" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftStartingPlayer" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftStartingPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPick" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "pickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftScoreExclusion" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftScoreExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftScoreOverride" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftScoreOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptainPlayerFlag" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptainPlayerFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Draft_status_idx" ON "Draft"("status");
CREATE INDEX "Draft_seasonLabel_idx" ON "Draft"("seasonLabel");
CREATE UNIQUE INDEX "DraftPlayer_draftId_playerId_key" ON "DraftPlayer"("draftId", "playerId");
CREATE INDEX "DraftPlayer_draftId_idx" ON "DraftPlayer"("draftId");
CREATE UNIQUE INDEX "DraftTeam_draftId_raterId_key" ON "DraftTeam"("draftId", "raterId");
CREATE UNIQUE INDEX "DraftTeam_draftId_pickOrder_key" ON "DraftTeam"("draftId", "pickOrder");
CREATE INDEX "DraftTeam_draftId_idx" ON "DraftTeam"("draftId");
CREATE UNIQUE INDEX "DraftStartingPlayer_draftId_playerId_key" ON "DraftStartingPlayer"("draftId", "playerId");
CREATE INDEX "DraftStartingPlayer_teamId_idx" ON "DraftStartingPlayer"("teamId");
CREATE UNIQUE INDEX "DraftPick_draftId_playerId_key" ON "DraftPick"("draftId", "playerId");
CREATE UNIQUE INDEX "DraftPick_draftId_pickNumber_key" ON "DraftPick"("draftId", "pickNumber");
CREATE INDEX "DraftPick_draftId_teamId_idx" ON "DraftPick"("draftId", "teamId");
CREATE UNIQUE INDEX "DraftScoreExclusion_draftId_playerId_raterId_key" ON "DraftScoreExclusion"("draftId", "playerId", "raterId");
CREATE INDEX "DraftScoreExclusion_draftId_playerId_idx" ON "DraftScoreExclusion"("draftId", "playerId");
CREATE UNIQUE INDEX "DraftScoreOverride_draftId_playerId_metric_key" ON "DraftScoreOverride"("draftId", "playerId", "metric");
CREATE INDEX "DraftScoreOverride_draftId_playerId_idx" ON "DraftScoreOverride"("draftId", "playerId");
CREATE UNIQUE INDEX "CaptainPlayerFlag_draftId_teamId_playerId_key" ON "CaptainPlayerFlag"("draftId", "teamId", "playerId");
CREATE INDEX "CaptainPlayerFlag_teamId_idx" ON "CaptainPlayerFlag"("teamId");

-- AddForeignKey
ALTER TABLE "DraftPlayer" ADD CONSTRAINT "DraftPlayer_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftPlayer" ADD CONSTRAINT "DraftPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftTeam" ADD CONSTRAINT "DraftTeam_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftTeam" ADD CONSTRAINT "DraftTeam_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "Rater"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DraftStartingPlayer" ADD CONSTRAINT "DraftStartingPlayer_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftStartingPlayer" ADD CONSTRAINT "DraftStartingPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "DraftTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftStartingPlayer" ADD CONSTRAINT "DraftStartingPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "DraftTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftScoreExclusion" ADD CONSTRAINT "DraftScoreExclusion_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftScoreExclusion" ADD CONSTRAINT "DraftScoreExclusion_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftScoreExclusion" ADD CONSTRAINT "DraftScoreExclusion_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "Rater"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftScoreOverride" ADD CONSTRAINT "DraftScoreOverride_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftScoreOverride" ADD CONSTRAINT "DraftScoreOverride_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaptainPlayerFlag" ADD CONSTRAINT "CaptainPlayerFlag_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaptainPlayerFlag" ADD CONSTRAINT "CaptainPlayerFlag_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "DraftTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaptainPlayerFlag" ADD CONSTRAINT "CaptainPlayerFlag_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
