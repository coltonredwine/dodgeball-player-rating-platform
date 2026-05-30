import { NextResponse } from "next/server";
import { requireAdmin, requireSuperadmin } from "@/lib/api-auth";
import { parseOptionalLink } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { isSuperadmin } from "@/lib/rbac";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { playerId } = await params;
  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    link?: string;
    active?: boolean;
  };

  const existing = await prisma.player.findUnique({ where: { id: playerId } });
  if (!existing) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const superadmin = isSuperadmin(auth.session);
  let firstName = existing.firstName;
  let lastName = existing.lastName;

  if (superadmin) {
    firstName = body.firstName?.trim() ?? "";
    lastName = body.lastName?.trim() ?? "";
    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
    }
  } else if (body.firstName !== undefined || body.lastName !== undefined) {
    const nextFirst = body.firstName?.trim() ?? existing.firstName;
    const nextLast = body.lastName?.trim() ?? existing.lastName;
    if (nextFirst !== existing.firstName || nextLast !== existing.lastName) {
      return NextResponse.json({ error: "Only superadmin can change player names" }, { status: 403 });
    }
  }

  const linkRaw = body.link?.trim() ?? "";
  const link = linkRaw ? parseOptionalLink(linkRaw) : null;
  if (linkRaw && !link) {
    return NextResponse.json({ error: "Invalid link URL" }, { status: 400 });
  }

  const player = await prisma.player.update({
    where: { id: playerId },
    data: {
      firstName,
      lastName,
      link: body.link !== undefined ? link : existing.link,
      active: body.active ?? existing.active,
    },
  });

  return NextResponse.json({ player });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const { playerId } = await params;
  const existing = await prisma.player.findUnique({ where: { id: playerId } });
  if (!existing) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  await prisma.player.delete({ where: { id: playerId } });
  return NextResponse.json({ ok: true });
}
