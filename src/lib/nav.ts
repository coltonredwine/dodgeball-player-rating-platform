import { AppSession } from "@/lib/auth";
import { getCaptainAssignmentsForRater } from "@/lib/draft/service";
import { isBackendUser } from "@/lib/rbac";
import { getSeasonLabel } from "@/lib/settings";

export type NavLink = {
  href: string;
  label: string;
};

export type LeagueOption = {
  label: string;
  href?: string;
};

export type AppNavData = {
  primaryLinks: NavLink[];
  showAdmin: boolean;
  adminHref: string;
  displayName: string;
  leagueLabel: string;
  leagues: LeagueOption[];
};

export async function getAppNavData(session: AppSession): Promise<AppNavData> {
  const leagueLabel = await getSeasonLabel();
  const leagues: LeagueOption[] = [{ label: leagueLabel }];

  let draftHref = "/draft";
  if (session.raterId) {
    const assignments = await getCaptainAssignmentsForRater(session.raterId);
    if (assignments.length === 1) {
      draftHref = `/draft/${assignments[0].draftId}/pick`;
    }
  } else if (isBackendUser(session)) {
    draftHref = "/backend/drafts";
  }

  return {
    primaryLinks: [
      { href: "/rate", label: "Rate" },
      { href: draftHref, label: "Draft" },
    ],
    showAdmin: isBackendUser(session),
    adminHref: "/backend",
    displayName: session.name || session.email,
    leagueLabel,
    leagues,
  };
}

/** @deprecated Use getAppNavData */
export async function getNavLinks(session: AppSession): Promise<NavLink[]> {
  const nav = await getAppNavData(session);
  const links = [...nav.primaryLinks];
  if (nav.showAdmin) links.push({ href: nav.adminHref, label: "Admin" });
  return links;
}

export function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === "/rate") return pathname === "/rate";
  if (href === "/backend") {
    return pathname.startsWith("/backend");
  }
  if (href === "/draft") {
    return pathname === "/draft" || pathname.startsWith("/draft/");
  }
  if (href.startsWith("/draft/")) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href.startsWith("/backend/drafts")) {
    return pathname.startsWith("/backend/drafts");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isDraftNavActive(pathname: string, draftHref: string): boolean {
  if (draftHref === "/draft") {
    return pathname === "/draft" || pathname.startsWith("/draft/");
  }
  return isNavLinkActive(pathname, draftHref);
}

export function isAdminNavActive(pathname: string): boolean {
  return pathname.startsWith("/backend");
}
