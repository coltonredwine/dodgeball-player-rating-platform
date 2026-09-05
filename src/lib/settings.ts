import { DEFAULT_SEASON } from "@/lib/constants";
import { prisma } from "@/lib/db";

export const RATE_PAGE_TITLE_KEY = "rate_page_title";
export const RATE_PAGE_BUTTON_TITLE_KEY = "rate_page_button_title";
export const RATE_PAGE_BUTTON_URL_KEY = "rate_page_button_url";

export async function getBooleanSetting(
  leagueId: string,
  key: string,
  fallback: boolean,
) {
  const row = await prisma.appSetting.findUnique({
    where: { leagueId_key: { leagueId, key } },
  });
  if (!row) return fallback;
  return row.value === "true";
}

export async function setBooleanSetting(leagueId: string, key: string, value: boolean) {
  await prisma.appSetting.upsert({
    where: { leagueId_key: { leagueId, key } },
    update: { value: String(value) },
    create: { leagueId, key, value: String(value) },
  });
}

export async function setStringSetting(leagueId: string, key: string, value: string) {
  await prisma.appSetting.upsert({
    where: { leagueId_key: { leagueId, key } },
    update: { value },
    create: { leagueId, key, value },
  });
}

export async function getStringSetting(leagueId: string, key: string, fallback: string) {
  const row = await prisma.appSetting.findUnique({
    where: { leagueId_key: { leagueId, key } },
  });
  return row?.value ?? fallback;
}

export async function getSeasonLabel(leagueId: string) {
  return getStringSetting(leagueId, "season_label", DEFAULT_SEASON);
}
