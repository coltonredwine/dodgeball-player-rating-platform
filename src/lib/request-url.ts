import { NextResponse } from "next/server";
import { getLeagueById } from "@/lib/league";
import { leaguePath } from "@/lib/league-path";

export function getRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

export function backendRedirect(
  request: Request,
  params?: Record<string, string>,
  path = "/backend",
  leagueSlug?: string,
) {
  const resolvedPath = leagueSlug ? leaguePath(leagueSlug, path) : path;
  const url = new URL(resolvedPath, getRequestOrigin(request));
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(url);
}

export async function backendRedirectForLeague(
  request: Request,
  leagueId: string,
  params?: Record<string, string>,
  path = "/backend",
) {
  const league = await getLeagueById(leagueId);
  if (!league) {
    return NextResponse.redirect(new URL("/login", getRequestOrigin(request)));
  }
  return backendRedirect(request, params, path, league.slug);
}
