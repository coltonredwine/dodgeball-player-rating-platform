import { getBooleanSetting, getStringSetting, setBooleanSetting, setStringSetting } from "@/lib/settings";

export const SCORING_OPEN_KEY = "scoring_open";
export const SCORING_CLOSE_AT_KEY = "scoring_close_at";

export function formatCloseAtForDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseDatetimeLocalToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function formatCloseAtDisplay(iso: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export async function getScoringCloseAt(): Promise<string> {
  return getStringSetting(SCORING_CLOSE_AT_KEY, "");
}

export async function isScoringOpen(): Promise<boolean> {
  const [manualOpen, closeAtRaw] = await Promise.all([
    getBooleanSetting(SCORING_OPEN_KEY, true),
    getScoringCloseAt(),
  ]);

  if (!manualOpen) return false;
  if (!closeAtRaw) return true;

  const closeAt = new Date(closeAtRaw);
  if (Number.isNaN(closeAt.getTime())) return true;

  return Date.now() < closeAt.getTime();
}

export async function saveScoringWindowSettings(manualOpen: boolean, closeAtIso: string | null) {
  await setBooleanSetting(SCORING_OPEN_KEY, manualOpen);
  await setStringSetting(SCORING_CLOSE_AT_KEY, closeAtIso ?? "");
}
