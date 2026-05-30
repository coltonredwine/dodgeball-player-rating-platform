import { NextResponse } from "next/server";
import { requireAdmin, requireSuperadmin } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { rotateRaterPasscode } from "@/lib/invite-codes";
import { DbRaterRole, parseDbRaterRole } from "@/lib/rater-roles";
import { isSuperadmin } from "@/lib/rbac";

export async function POST(request: Request) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    role?: string;
    passcode?: string;
    active?: boolean;
  };

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const role = parseDbRaterRole(body.role ?? "rater") ?? "rater";
  const passcode = body.passcode?.trim() ?? "";

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const existing = await prisma.rater.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A rater with this email already exists" }, { status: 409 });
  }

  const rater = await prisma.rater.create({
    data: {
      name,
      email,
      role,
      active: body.active ?? true,
      passcodeDisplay: passcode || null,
    },
  });

  if (passcode) {
    await rotateRaterPasscode(rater.id, passcode);
  }

  return NextResponse.json({ rater });
}
