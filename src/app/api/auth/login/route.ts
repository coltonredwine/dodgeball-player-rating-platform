import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession, getSuperadminIdentity } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      passcode?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const passcode = body.passcode?.trim();

    if (!email || !passcode) {
      return NextResponse.json({ error: "Email and passcode are required" }, { status: 400 });
    }

    const limiter = checkRateLimit(`login:${email}`, 12, 15 * 60 * 1000);
    if (!limiter.ok) {
      return NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    }

    const superadmin = getSuperadminIdentity();
    if (email === superadmin.email.toLowerCase() && passcode === superadmin.passcode) {
      await createSession({
        role: "superadmin",
        email: superadmin.email.toLowerCase(),
        name: "Superadmin",
      });
      return NextResponse.json({ ok: true });
    }

    const rater = await prisma.rater.findUnique({
      where: { email },
      include: { inviteCodes: true },
    });
    if (!rater || !rater.active) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const now = new Date();
    const validCode = rater.inviteCodes.find(
      (code) =>
        !code.revokedAt &&
        code.expiresAt > now &&
        bcrypt.compareSync(passcode, code.codeHash),
    );

    if (!validCode) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await prisma.inviteCode.update({
      where: { id: validCode.id },
      data: { lastUsedAt: now },
    });

    await createSession({
      role: rater.isAdmin ? "admin" : "rater",
      raterId: rater.id,
      email: rater.email,
      name: rater.name,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        error:
          "Login failed due to server configuration. Verify SESSION_SECRET and DATABASE_URL in .env.",
      },
      { status: 500 },
    );
  }
}
