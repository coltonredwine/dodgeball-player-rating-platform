import { z } from "zod";
import { METRIC_FIELDS } from "@/lib/constants";

const scoreValue = z.number().int().min(1).max(7).nullable();

export const ratingRowSchema = z.object({
  playerId: z.string().min(1),
  unknownPlayer: z.boolean(),
  power: scoreValue,
  accuracy: scoreValue,
  intimidation: scoreValue,
  catching: scoreValue,
  evasion: scoreValue,
  nerve: scoreValue,
});

export const autosaveSchema = z.object({
  submissionId: z.string().min(1),
  rows: z.array(ratingRowSchema),
});

export function normalizeRatingRow(row: z.infer<typeof ratingRowSchema>) {
  if (!row.unknownPlayer) return row;
  const normalized = { ...row };
  for (const field of METRIC_FIELDS) {
    normalized[field] = null;
  }
  return normalized;
}

export function isCompleteRatingRow(row: z.infer<typeof ratingRowSchema>) {
  if (row.unknownPlayer) return true;
  return METRIC_FIELDS.every((field) => {
    const value = row[field];
    return typeof value === "number" && value >= 1 && value <= 7;
  });
}
