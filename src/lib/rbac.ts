import { AppSession } from "@/lib/auth";

export function isAdminLike(session: AppSession) {
  return session.role === "admin" || session.role === "superadmin";
}

export function isSuperadmin(session: AppSession) {
  return session.role === "superadmin";
}
