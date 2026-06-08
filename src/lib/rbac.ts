import { AppSession, SessionRole } from "@/lib/auth";
import { DbRaterRole } from "@/lib/rater-roles";

export function isBackendUser(session: AppSession) {
  return session.role === "manager" || session.role === "admin" || session.role === "superadmin";
}

export function isManager(session: AppSession) {
  return session.role === "manager";
}

export function isAdminLike(session: AppSession) {
  return session.role === "admin" || session.role === "superadmin";
}

export function canEditDrafts(session: AppSession) {
  return isAdminLike(session);
}

export function isSuperadmin(session: AppSession) {
  return session.role === "superadmin";
}

export function canSeeRaterPasscode(session: AppSession, raterRole: DbRaterRole) {
  if (session.role === "superadmin") return true;
  if (raterRole !== "rater") return false;
  return session.role === "manager" || session.role === "admin";
}

export function dbRoleToSessionRole(role: DbRaterRole): SessionRole {
  return role;
}
