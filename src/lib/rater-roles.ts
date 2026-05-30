export type DbRaterRole = "rater" | "manager" | "admin";

export const DB_RATER_ROLES: DbRaterRole[] = ["rater", "manager", "admin"];

export function parseDbRaterRole(raw: string): DbRaterRole | null {
  const value = raw.trim().toLowerCase();
  if (value === "rater" || value === "manager" || value === "admin") return value;
  if (value === "true" || value === "yes" || value === "1") return "manager";
  if (value === "false" || value === "no" || value === "0" || value === "") return "rater";
  return null;
}

export function formatDbRaterRole(role: DbRaterRole) {
  return role;
}
