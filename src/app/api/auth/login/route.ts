import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession, getSuperadminIdentity } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findLeagueBySlug, normalizeLeagueSlug } from "@/lib/league";
import { checkRateLimit } from "@/lib/rate-limit";
import { dbRoleToSessionRole } from "@/lib/rbac";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      passcode?: string;
      leagueSlug?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const passcode = body.passcode?.trim();
    const leagueSlug = normalizeLeagueSlug(body.leagueSlug ?? "");

    if (!email || !passcode || !leagueSlug) {
      return NextResponse.json(
        { error: "League code, email, and passcode are required" },
        { status: 400 },
      );
    }

    const limiter = checkRateLimit(`login:${leagueSlug}:${email}`, 12, 15 * 60 * 1000);
    if (!limiter.ok) {
      return NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    }

    const league = await findLeagueBySlug(leagueSlug);
    if (!league) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const superadmin = getSuperadminIdentity();
    if (email === superadmin.email.toLowerCase() && passcode === superadmin.passcode) {
      await createSession({
        role: "superadmin",
        leagueId: league.id,
        email: superadmin.email.toLowerCase(),
        name: "Superadmin",
      });
      return NextResponse.json({ ok: true });
    }

    const rater = await prisma.rater.findUnique({
      where: { leagueId_email: { leagueId: league.id, email } },
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
      role: dbRoleToSessionRole(rater.role),
      raterId: rater.id,
      leagueId: league.id,
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
