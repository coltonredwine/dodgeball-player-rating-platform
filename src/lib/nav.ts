import { AppSession } from "@/lib/auth";
import { isBackendUser, isSuperadmin } from "@/lib/rbac";

export type NavLink = {
  href: string;
  label: string;
};

export function getNavLinks(session: AppSession): NavLink[] {
  const links: NavLink[] = [{ href: "/rate", label: "Rate players" }];

  if (isBackendUser(session)) {
    links.push({ href: "/backend", label: "Admin" });
  }

  if (isSuperadmin(session)) {
    links.push({ href: "/backend/settings", label: "Settings" });
  }

  return links;
}

export function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === "/rate") return pathname === "/rate";
  if (href === "/backend/settings") return pathname.startsWith("/backend/settings");
  if (href === "/backend") {
    return pathname.startsWith("/backend") && !pathname.startsWith("/backend/settings");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
