import { NextResponse } from "next/server";
import { requireAdmin, requireSuperadmin } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { rotateRaterPasscode } from "@/lib/invite-codes";
import { DbRaterRole, parseDbRaterRole } from "@/lib/rater-roles";
import { isSuperadmin } from "@/lib/rbac";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ raterId: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { raterId } = await params;
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    role?: string;
    passcode?: string;
    active?: boolean;
  };

  const existing = await prisma.rater.findUnique({ where: { id: raterId } });
  if (!existing) {
    return NextResponse.json({ error: "Rater not found" }, { status: 404 });
  }

  const superadmin = isSuperadmin(auth.session);
  const data: {
    name?: string;
    email?: string;
    role?: DbRaterRole;
    active?: boolean;
  } = {};

  if (body.name !== undefined) {
    if (!superadmin) {
      return NextResponse.json({ error: "Only superadmin can change rater names" }, { status: 403 });
    }
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    data.name = name;
  }

  if (body.email !== undefined) {
    const email = body.email.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (email !== existing.email) {
      const conflict = await prisma.rater.findUnique({ where: { email } });
      if (conflict) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }
    data.email = email;
  }

  if (body.role !== undefined) {
    if (!superadmin) {
      return NextResponse.json({ error: "Only superadmin can change rater roles" }, { status: 403 });
    }
    const role = parseDbRaterRole(body.role);
    if (!role) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    data.role = role;
  }

  if (body.active !== undefined) {
    if (!superadmin) {
      return NextResponse.json({ error: "Only superadmin can change active status" }, { status: 403 });
    }
    data.active = body.active;
  }

  if (Object.keys(data).length > 0) {
    await prisma.rater.update({ where: { id: raterId }, data });
  }

  const passcode = body.passcode?.trim();
  if (passcode) {
    await rotateRaterPasscode(raterId, passcode);
  }

  const updated = await prisma.rater.findUnique({ where: { id: raterId } });
  return NextResponse.json({ rater: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ raterId: string }> },
) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const { raterId } = await params;
  const existing = await prisma.rater.findUnique({ where: { id: raterId } });
  if (!existing) {
    return NextResponse.json({ error: "Rater not found" }, { status: 404 });
  }

  await prisma.rater.delete({ where: { id: raterId } });
  return NextResponse.json({ ok: true });
}
