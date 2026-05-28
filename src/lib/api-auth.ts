import { NextResponse } from "next/server";
import { AppSession, getSession } from "@/lib/auth";
import { isAdminLike, isSuperadmin } from "@/lib/rbac";

export async function requireAdminLike() {
  const session = await getSession();
  if (!session || !isAdminLike(session)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function requireSuperadmin() {
  const session = await getSession();
  if (!session || !isSuperadmin(session)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export function ensureOwnRaterOrSuperadmin(session: AppSession, raterId: string) {
  if (session.role === "superadmin") return true;
  return session.raterId === raterId;
}
