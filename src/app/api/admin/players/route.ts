import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { parseOptionalLink } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { findPlayerByNamesInLeague } from "@/lib/players";
import { syncCollectedSubmissionsForNewPlayers } from "@/lib/collection";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const leagueId = auth.session.leagueId;
  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    link?: string;
    active?: boolean;
  };

  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
  }

  const linkRaw = body.link?.trim() ?? "";
  const link = linkRaw ? parseOptionalLink(linkRaw) : null;
  if (linkRaw && !link) {
    return NextResponse.json({ error: "Invalid link URL" }, { status: 400 });
  }

  const existing = await findPlayerByNamesInLeague(leagueId, firstName, lastName);
  if (existing) {
    return NextResponse.json({ error: "A player with this name already exists" }, { status: 409 });
  }

  const player = await prisma.player.create({
    data: {
      leagueId,
      firstName,
      lastName,
      link,
      active: body.active ?? true,
    },
  });

  if (player.active) {
    await syncCollectedSubmissionsForNewPlayers(leagueId);
  }

  return NextResponse.json({ player });
}
