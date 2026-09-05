import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { dbRoleToSessionRole } from "@/lib/rbac";

type SessionRole = "rater" | "manager" | "admin" | "superadmin";

export type { SessionRole };

export type AppSession = {
  role: SessionRole;
  raterId?: string;
  leagueId: string;
  email: string;
  name: string;
};

const COOKIE_NAME = "player_scores_session";

function getJwtSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required");
  }
  return new TextEncoder().encode(secret);
}

function isValidSessionPayload(payload: unknown): payload is AppSession {
  if (!payload || typeof payload !== "object") return false;
  const value = payload as Record<string, unknown>;
  return (
    typeof value.leagueId === "string" &&
    value.leagueId.length > 0 &&
    typeof value.email === "string" &&
    typeof value.name === "string" &&
    typeof value.role === "string"
  );
}

export async function createSession(session: AppSession) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10d")
    .sign(getJwtSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, getJwtSecret());
    if (!isValidSessionPayload(verified.payload)) return null;
    return {
      role: verified.payload.role as SessionRole,
      raterId: typeof verified.payload.raterId === "string" ? verified.payload.raterId : undefined,
      leagueId: verified.payload.leagueId,
      email: verified.payload.email,
      name: verified.payload.name,
    };
  } catch {
    return null;
  }
}

/** Resolves DB-backed role for rater sessions so permissions stay current. */
export async function resolveSession(): Promise<AppSession | null> {
  const session = await getSession();
  if (!session) return null;

  const league = await prisma.league.findUnique({ where: { id: session.leagueId } });
  if (!league) return null;

  if (!session.raterId) {
    return { ...session, leagueId: league.id };
  }

  const rater = await prisma.rater.findFirst({
    where: { id: session.raterId, leagueId: session.leagueId },
  });
  if (!rater || !rater.active) return null;

  return {
    ...session,
    leagueId: league.id,
    role: dbRoleToSessionRole(rater.role),
    name: rater.name,
    email: rater.email,
  };
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export function getSuperadminIdentity() {
  return {
    email: process.env.SUPERADMIN_EMAIL ?? "coltonredwine@gmail.com",
    passcode: process.env.SUPERADMIN_PASSCODE ?? "g0odJob!",
  };
}
