/** Client-safe path helpers (no server-only imports). */

export function normalizeLeagueSlugForPath(raw: string) {
  return raw.trim().toLowerCase();
}

export function leaguePath(leagueSlug: string, path = "/") {
  const slug = normalizeLeagueSlugForPath(leagueSlug);
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return `/${slug}`;
  return `/${slug}${normalized}`;
}

export function stripLeaguePrefix(pathname: string, leagueSlug: string) {
  const prefix = `/${normalizeLeagueSlugForPath(leagueSlug)}`;
  if (pathname === prefix) return "/";
  if (pathname.startsWith(`${prefix}/`)) {
    return pathname.slice(prefix.length) || "/";
  }
  return pathname;
}
