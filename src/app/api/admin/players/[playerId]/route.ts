import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/api-auth";
import { parseOptionalLink } from "@/lib/csv";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const { playerId } = await params;
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

  const existing = await prisma.player.findUnique({ where: { id: playerId } });
  if (!existing) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const player = await prisma.player.update({
    where: { id: playerId },
    data: {
      firstName,
      lastName,
      link,
      active: body.active ?? existing.active,
    },
  });

  return NextResponse.json({ player });
}
