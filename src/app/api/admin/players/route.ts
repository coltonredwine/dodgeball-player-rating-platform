import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/api-auth";
import { parseOptionalLink } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { playerIdFromNames } from "@/lib/players";

export async function POST(request: Request) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

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

  const id = playerIdFromNames(firstName, lastName);
  const existing = await prisma.player.findUnique({ where: { id } });
  if (existing) {
    return NextResponse.json({ error: "A player with this name already exists" }, { status: 409 });
  }

  const player = await prisma.player.create({
    data: {
      id,
      firstName,
      lastName,
      link,
      active: body.active ?? true,
    },
  });

  return NextResponse.json({ player });
}
