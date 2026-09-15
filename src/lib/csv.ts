import Papa from "papaparse";

export function parseCsv(text: string) {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim().replace(/^\uFEFF/, ""),
  });
  // Ignore delimiter/quote nags that still produce usable rows.
  const fatal = parsed.errors.filter((error) => error.type === "Delimiter" || error.code === "MissingQuotes");
  if (fatal.length > 0 && parsed.data.length === 0) {
    throw new Error(fatal[0]!.message);
  }
  return parsed.data.filter((row) =>
    Object.values(row).some((value) => String(value ?? "").trim().length > 0),
  );
}

export function csvEscape(value: string | number | null | undefined) {
  const raw = value == null ? "" : String(value);
  if (!/[",\n]/.test(raw)) return raw;
  return `"${raw.replaceAll('"', '""')}"`;
}

export function rowsToCsv(headers: string[], rows: Array<Array<string | number | null>>) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\n");
}

export const PLAYER_IMPORT_HEADERS = ["First Name", "Last Name", "Link", "Active"] as const;

/** Collapse internal whitespace and trim for CSV ↔ DB name matching. */
export function normalizePersonName(raw: string) {
  return raw.replace(/\s+/g, " ").trim();
}

export function parseOptionalLink(raw: string): string | null {
  const trimmed = raw.trim().replace(/^<|>$/g, "");
  if (!trimmed) return null;

  try {
    const candidate = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Parse Active CSV values: Y/N, Yes/No, true/false, 1/0, active/inactive. Empty → null. */
export function parseActiveFlag(raw: string): boolean | null {
  const normalized = raw.trim().toLowerCase().replace(/\.0$/, "");
  if (!normalized) return null;
  if (["y", "yes", "true", "1", "t", "active", "on"].includes(normalized)) return true;
  if (["n", "no", "false", "0", "f", "inactive", "off"].includes(normalized)) return false;
  return null;
}

export function formatActiveFlag(active: boolean) {
  return active ? "Y" : "N";
}
export const RATER_IMPORT_HEADERS = [
  "Name",
  "Email",
  "role",
  "Passcode",
  "Expires At",
] as const;

export function csvDownloadResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
