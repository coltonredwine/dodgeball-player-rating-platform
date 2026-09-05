import { NextResponse } from "next/server";
import { AppSession, resolveSession } from "@/lib/auth";
import { isAdminLike, isBackendUser, isSuperadmin } from "@/lib/rbac";

export async function requireBackendUser() {
  const session = await resolveSession();
  if (!session || !isBackendUser(session)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

/** @deprecated Use requireBackendUser for read/export access. */
export async function requireAdminLike() {
  return requireBackendUser();
}

export async function requireAdmin() {
  const session = await resolveSession();
  if (!session || !isAdminLike(session)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function requireSuperadmin() {
  const session = await resolveSession();
  if (!session || !isSuperadmin(session)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export function ensureOwnRaterOrSuperadmin(session: AppSession, raterId: string) {
  if (session.role === "superadmin") return true;
  return session.raterId === raterId;
}
