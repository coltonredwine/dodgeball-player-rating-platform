-- CreateEnum
CREATE TYPE "DraftTradeRequestStatus" AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

-- CreateTable
CREATE TABLE "DraftTradeRequest" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "proposingTeamId" TEXT NOT NULL,
    "counterpartyTeamId" TEXT NOT NULL,
    "offeredPlayerId" TEXT NOT NULL,
    "requestedPlayerId" TEXT NOT NULL,
    "status" "DraftTradeRequestStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DraftTradeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DraftTradeRequest_draftId_status_idx" ON "DraftTradeRequest"("draftId", "status");

-- CreateIndex
CREATE INDEX "DraftTradeRequest_proposingTeamId_status_idx" ON "DraftTradeRequest"("proposingTeamId", "status");

-- CreateIndex
CREATE INDEX "DraftTradeRequest_counterpartyTeamId_status_idx" ON "DraftTradeRequest"("counterpartyTeamId", "status");

-- AddForeignKey
ALTER TABLE "DraftTradeRequest" ADD CONSTRAINT "DraftTradeRequest_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftTradeRequest" ADD CONSTRAINT "DraftTradeRequest_proposingTeamId_fkey" FOREIGN KEY ("proposingTeamId") REFERENCES "DraftTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftTradeRequest" ADD CONSTRAINT "DraftTradeRequest_counterpartyTeamId_fkey" FOREIGN KEY ("counterpartyTeamId") REFERENCES "DraftTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
