import Papa from "papaparse";

export function parseCsv(text: string) {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().replace(/^\uFEFF/, ""),
  });
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0].message);
  }
  return parsed.data;
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

export const PLAYER_IMPORT_HEADERS = ["First Name", "Last Name", "Link"] as const;

export function parseOptionalLink(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
export const RATER_IMPORT_HEADERS = [
  "Name",
  "Email",
  "is_admin",
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
