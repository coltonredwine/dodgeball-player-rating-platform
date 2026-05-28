import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

type SessionRole = "rater" | "admin" | "superadmin";

export type AppSession = {
  role: SessionRole;
  raterId?: string;
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
    return verified.payload as AppSession;
  } catch {
    return null;
  }
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
