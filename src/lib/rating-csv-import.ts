import Papa from "papaparse";
import { METRIC_FIELDS, MetricField } from "@/lib/constants";
import { playerIdFromNames } from "@/lib/players";

export type ImportableRatingRow = {
  playerId: string;
  firstName: string;
  lastName: string;
  link: string | null;
  power: number | null;
  accuracy: number | null;
  intimidation: number | null;
  catching: number | null;
  evasion: number | null;
  nerve: number | null;
  unknownPlayer: boolean;
};

export const CSV_FORMAT_ERROR =
  "Could not read this CSV file. Check that it is a valid CSV with player names and score columns.";

export const CSV_NO_MATCH_ERROR =
  "No players in the CSV matched anyone on your rating list.";

function parseCsvRows(text: string) {
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(CSV_FORMAT_ERROR);
  }

  return parsed.data.map((row) => row.map((cell) => cell.trim()));
}

function trimTrailingEmpty(cells: string[]) {
  const next = [...cells];
  while (next.length > 0 && next[next.length - 1] === "") {
    next.pop();
  }
  return next;
}

function isNameCell(value: string) {
  return value.trim().length > 0 && !/^\d+$/.test(value.trim());
}

function isScoreCell(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^[1-7]$/.test(trimmed);
}

function isLikelyHeaderRow(cells: string[]) {
  const row = trimTrailingEmpty(cells);
  const first = (row[0] ?? "").toLowerCase();
  const second = (row[1] ?? "").toLowerCase();

  if (first.includes("first") && second.includes("last")) return true;
  if (/name|player/.test(first) && /name|last|player|surname/.test(second)) return true;

  const scoreColumns = row.slice(2, 8);
  const hasScoreLabels = scoreColumns.some((cell) => {
    const trimmed = cell.trim();
    return trimmed.length > 0 && !/^[1-7]$/.test(trimmed);
  });

  return hasScoreLabels && (!isNameCell(row[0] ?? "") || !isNameCell(row[1] ?? ""));
}

function isValidDataRow(cells: string[]) {
  const row = trimTrailingEmpty(cells);
  if (row.length < 2) return false;
  if (!isNameCell(row[0]) || !isNameCell(row[1])) return false;

  for (let index = 2; index < 8; index += 1) {
    if (!isScoreCell(row[index] ?? "")) return false;
  }

  return true;
}

function resolveDataRows(rawRows: string[][]) {
  if (rawRows.length === 0) {
    return [] as string[][];
  }

  if (isValidDataRow(rawRows[0])) {
    return rawRows;
  }

  if (rawRows.length > 1 && (isLikelyHeaderRow(rawRows[0]) || rawRows.slice(1).some(isValidDataRow))) {
    return rawRows.slice(1);
  }

  return rawRows;
}

function parseScore(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number(trimmed);
}

function parseUnknown(value: string | undefined) {
  if (value === undefined) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return normalized === "true" || normalized === "yes" || normalized === "1";
}

type ParsedCsvRow = {
  firstName: string;
  lastName: string;
  scores: Record<MetricField, number | null>;
  unknownPlayer: boolean;
};

function parseDataRow(cells: string[]): ParsedCsvRow {
  const row = trimTrailingEmpty(cells);
  const firstName = row[0].trim();
  const lastName = row[1].trim();
  const unknownPlayer = row.length >= 9 ? parseUnknown(row[8]) : false;

  const scores = {} as Record<MetricField, number | null>;
  for (const [index, field] of METRIC_FIELDS.entries()) {
    scores[field] = unknownPlayer ? null : parseScore(row[index + 2] ?? "");
  }

  return { firstName, lastName, scores, unknownPlayer };
}

export function mergeCsvIntoRatingRows(csvText: string, currentRows: ImportableRatingRow[]) {
  const rawRows = parseCsvRows(csvText);
  if (rawRows.length === 0) {
    return { rows: currentRows, formatError: CSV_FORMAT_ERROR, updatedCount: 0 };
  }

  const dataRows = resolveDataRows(rawRows);
  const byId = new Map(currentRows.map((row) => [row.playerId, { ...row }]));
  const byName = new Map(
    currentRows.map((row) => [
      playerIdFromNames(row.firstName, row.lastName),
      row.playerId,
    ]),
  );
  let updatedCount = 0;

  for (const row of dataRows) {
    if (!isValidDataRow(row)) continue;

    const parsed = parseDataRow(row);
    const nameKey = playerIdFromNames(parsed.firstName, parsed.lastName);
    const playerId = byName.get(nameKey);
    if (!playerId) continue;
    const existing = byId.get(playerId);
    if (!existing) continue;

    byId.set(playerId, {
      ...existing,
      unknownPlayer: parsed.unknownPlayer,
      ...parsed.scores,
    });
    updatedCount += 1;
  }

  if (updatedCount === 0) {
    return {
      rows: currentRows,
      formatError: CSV_NO_MATCH_ERROR,
      updatedCount: 0,
    };
  }

  return {
    rows: currentRows.map((row) => byId.get(row.playerId)!),
    formatError: null,
    updatedCount,
  };
}

export function emptyRatingRows(rows: ImportableRatingRow[]) {
  return rows.map((row) => ({
    ...row,
    unknownPlayer: false,
    power: null,
    accuracy: null,
    intimidation: null,
    catching: null,
    evasion: null,
    nerve: null,
  }));
}
