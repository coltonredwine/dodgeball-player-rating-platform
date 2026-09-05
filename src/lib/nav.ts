import { AppSession } from "@/lib/auth";
import {
  countOpenDrafts,
  getCaptainAssignmentsForRater,
} from "@/lib/draft/service";
import { getLeagueById } from "@/lib/league";
import { leaguePath, stripLeaguePrefix } from "@/lib/league-path";
import { isAdminLike, isBackendUser, isManager } from "@/lib/rbac";

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
  leagueSlug: string;
  leagues: LeagueOption[];
};

export async function getAppNavData(session: AppSession): Promise<AppNavData> {
  const league = await getLeagueById(session.leagueId);
  const leagueLabel = league?.name ?? "League";
  const leagueSlug = league?.slug ?? "";
  const leagues: LeagueOption[] = [{ label: leagueLabel }];
  const path = (p: string) => leaguePath(leagueSlug, p);

  const primaryLinks: NavLink[] = [{ href: path("/rate"), label: "Rate" }];

  if (isAdminLike(session)) {
    primaryLinks.push({ href: path("/backend/drafts"), label: "Draft" });
  } else if (isManager(session)) {
    const openCount = await countOpenDrafts(session.leagueId);
    if (openCount > 0) {
      primaryLinks.push({ href: path("/backend/drafts"), label: "Draft" });
    }
  } else if (session.raterId) {
    const assignments = await getCaptainAssignmentsForRater(session.raterId);
    if (assignments.length === 1) {
      primaryLinks.push({
        href: path(`/draft/${assignments[0].draftId}/pick`),
        label: "Draft",
      });
    } else if (assignments.length > 1) {
      primaryLinks.push({ href: path("/draft"), label: "Draft" });
    }
  } else if (isBackendUser(session)) {
    primaryLinks.push({ href: path("/backend/drafts"), label: "Draft" });
  }

  return {
    primaryLinks,
    showAdmin: isBackendUser(session),
    adminHref: path("/backend"),
    displayName: session.name || session.email,
    leagueLabel,
    leagueSlug,
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

export function isNavLinkActive(
  pathname: string,
  href: string,
  leagueSlug?: string,
): boolean {
  const path = leagueSlug ? stripLeaguePrefix(pathname, leagueSlug) : pathname;
  const target = leagueSlug ? stripLeaguePrefix(href, leagueSlug) : href;

  if (target === "/rate") return path === "/rate";
  if (target === "/backend") {
    return path.startsWith("/backend");
  }
  if (target === "/draft") {
    return path === "/draft" || path.startsWith("/draft/");
  }
  if (target.startsWith("/draft/")) {
    return path === target || path.startsWith(`${target}/`);
  }
  if (target.startsWith("/backend/drafts")) {
    return path.startsWith("/backend/drafts");
  }
  return path === target || path.startsWith(`${target}/`);
}

export function isDraftNavActive(
  pathname: string,
  draftHref: string,
  leagueSlug?: string,
): boolean {
  const path = leagueSlug ? stripLeaguePrefix(pathname, leagueSlug) : pathname;
  const target = leagueSlug ? stripLeaguePrefix(draftHref, leagueSlug) : draftHref;
  if (target === "/draft") {
    return path === "/draft" || path.startsWith("/draft/");
  }
  return isNavLinkActive(pathname, draftHref, leagueSlug);
}

export function isAdminNavActive(pathname: string, leagueSlug?: string): boolean {
  const path = leagueSlug ? stripLeaguePrefix(pathname, leagueSlug) : pathname;
  return path.startsWith("/backend");
}
