import { rowsToCsv } from "@/lib/csv";

export const RATER_EXPORT_HEADERS = [
  "First Name",
  "Last Name",
  "Power",
  "Accuracy",
  "Intimidation",
  "Catching",
  "Evasion",
  "Nerve",
  "I don't know this player",
] as const;

type ExportRating = {
  player: { firstName: string; lastName: string };
  power: number | null;
  accuracy: number | null;
  intimidation: number | null;
  catching: number | null;
  evasion: number | null;
  nerve: number | null;
  unknownPlayer: boolean;
};

export function formatRaterExportFilename(raterName: string, date = new Date()) {
  const safeName = raterName.replace(/[^\w\s-]/g, "").trim() || "Rater";
  const isoDate = date.toISOString().slice(0, 10);
  return `${safeName}_Player Ratings_${isoDate}.csv`;
}

export function buildRaterExportCsv(ratings: ExportRating[]) {
  const rows = ratings.map((row) => [
    row.player.firstName,
    row.player.lastName,
    row.power,
    row.accuracy,
    row.intimidation,
    row.catching,
    row.evasion,
    row.nerve,
    row.unknownPlayer ? "true" : "false",
  ]);
  return rowsToCsv([...RATER_EXPORT_HEADERS], rows);
}
