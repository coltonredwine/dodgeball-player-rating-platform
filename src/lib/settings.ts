import { DEFAULT_SEASON } from "@/lib/constants";
import { prisma } from "@/lib/db";

export async function getBooleanSetting(key: string, fallback: boolean) {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  return row.value === "true";
}

export async function setBooleanSetting(key: string, value: boolean) {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
}

export async function getStringSetting(key: string, fallback: string) {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function getSeasonLabel() {
  return getStringSetting("season_label", DEFAULT_SEASON);
}
