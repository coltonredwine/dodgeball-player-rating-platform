import { prisma } from "@/lib/db";
import { DEFAULT_SEASON } from "@/lib/constants";
import {
  RATE_PAGE_BUTTON_TITLE_KEY,
  RATE_PAGE_BUTTON_URL_KEY,
  RATE_PAGE_TITLE_KEY,
  setBooleanSetting,
  setStringSetting,
} from "@/lib/settings";
import { SCORING_OPEN_KEY } from "@/lib/scoring-window";
import type { AppSession } from "@/lib/auth";

export const DEFAULT_LEAGUE_ID = "cldefaultstonewall00001";
export const DEFAULT_LEAGUE_SLUG = "stonewall";
export const DEFAULT_LEAGUE_NAME = "Stonewall";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeLeagueSlug(raw: string) {
  return raw.trim().toLowerCase();
}

export function isValidLeagueSlug(slug: string) {
  return SLUG_PATTERN.test(slug) && slug.length >= 2 && slug.length <= 64;
}

export function requireLeagueId(session: AppSession): string {
  if (!session.leagueId) {
    throw new Error("Missing league context");
  }
  return session.leagueId;
}

export async function findLeagueBySlug(slug: string) {
  const normalized = normalizeLeagueSlug(slug);
  if (!normalized) return null;
  return prisma.league.findUnique({ where: { slug: normalized } });
}

export async function getLeagueById(leagueId: string) {
  return prisma.league.findUnique({ where: { id: leagueId } });
}

export async function listLeagues() {
  return prisma.league.findMany({ orderBy: { name: "asc" } });
}

export async function seedLeagueSettings(leagueId: string) {
  await setBooleanSetting(leagueId, SCORING_OPEN_KEY, true);
  await setStringSetting(leagueId, "season_label", DEFAULT_SEASON);
  await setStringSetting(leagueId, RATE_PAGE_TITLE_KEY, "");
  await setStringSetting(leagueId, RATE_PAGE_BUTTON_TITLE_KEY, "");
  await setStringSetting(leagueId, RATE_PAGE_BUTTON_URL_KEY, "");
}

export async function createLeague(input: { name: string; slug: string }) {
  const name = input.name.trim();
  const slug = normalizeLeagueSlug(input.slug);

  if (!name) {
    throw new Error("League name is required");
  }
  if (!isValidLeagueSlug(slug)) {
    throw new Error(
      "League code must be 2–64 characters: lowercase letters, numbers, and hyphens only",
    );
  }

  const existing = await prisma.league.findUnique({ where: { slug } });
  if (existing) {
    throw new Error("A league with this code already exists");
  }

  const league = await prisma.league.create({
    data: { name, slug },
  });
  await seedLeagueSettings(league.id);
  return league;
}

export async function assertPlayerInLeague(playerId: string, leagueId: string) {
  const player = await prisma.player.findFirst({
    where: { id: playerId, leagueId },
  });
  if (!player) {
    throw new Error("Player not found in this league");
  }
  return player;
}

export async function assertRaterInLeague(raterId: string, leagueId: string) {
  const rater = await prisma.rater.findFirst({
    where: { id: raterId, leagueId },
  });
  if (!rater) {
    throw new Error("Rater not found in this league");
  }
  return rater;
}

export async function assertDraftInLeague(draftId: string, leagueId: string) {
  const draft = await prisma.draft.findFirst({
    where: { id: draftId, leagueId },
  });
  if (!draft) {
    throw new Error("Draft not found in this league");
  }
  return draft;
}
