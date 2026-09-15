import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/api-auth";
import {
  normalizePersonName,
  parseActiveFlag,
  parseCsv,
  parseOptionalLink,
} from "@/lib/csv";
import { backendRedirectForLeague } from "@/lib/request-url";
import { syncCollectedSubmissionsForNewPlayers } from "@/lib/collection";

type PlayerImportRow = {
  firstName: string;
  lastName: string;
  /** null = clear link; undefined = leave existing link unchanged */
  link: string | null | undefined;
  active: boolean;
};

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function findHeaderValue(row: Record<string, string>, predicate: (normalized: string) => boolean) {
  for (const [header, value] of Object.entries(row)) {
    if (predicate(normalizeHeader(header))) return String(value ?? "");
  }
  return "";
}

function getFirstName(row: Record<string, string>) {
  return findHeaderValue(
    row,
    (header) =>
      header === "first name" ||
      header === "first" ||
      header === "firstname" ||
      header === "player first name",
  );
}

function getLastName(row: Record<string, string>) {
  return findHeaderValue(
    row,
    (header) =>
      header === "last name" ||
      header === "last" ||
      header === "lastname" ||
      header === "player last name",
  );
}

function getLinkRaw(row: Record<string, string>) {
  return findHeaderValue(
    row,
    (header) =>
      header === "link" ||
      header === "url" ||
      header === "picture link" ||
      header === "photo link" ||
      header === "instagram" ||
      header === "instagram link" ||
      header.includes("picture") ||
      header.includes("instagram") ||
      (header.includes("link") && !header.includes("first") && !header.includes("last")),
  ).trim();
}

function getActiveRaw(row: Record<string, string>) {
  return findHeaderValue(
    row,
    (header) =>
      header === "active" ||
      header === "register" ||
      header === "registered" ||
      header.includes("active") ||
      header.includes("register"),
  ).trim();
}

function csvHasActiveColumn(rows: Record<string, string>[]) {
  if (rows.length === 0) return false;
  return Object.keys(rows[0]!).some((header) => {
    const normalized = normalizeHeader(header);
    return (
      normalized === "active" ||
      normalized === "register" ||
      normalized === "registered" ||
      normalized.includes("active") ||
      normalized.includes("register")
    );
  });
}

function csvHasLinkColumn(rows: Record<string, string>[]) {
  if (rows.length === 0) return false;
  return Object.keys(rows[0]!).some((header) => {
    const normalized = normalizeHeader(header);
    return (
      normalized === "link" ||
      normalized === "url" ||
      normalized.includes("picture") ||
      normalized.includes("instagram") ||
      (normalized.includes("link") && !normalized.includes("first") && !normalized.includes("last"))
    );
  });
}

export async function POST(request: Request) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const leagueId = auth.session.leagueId;
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
  }

  let rows: Record<string, string>[];
  try {
    rows = parseCsv(await file.text());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not parse CSV" },
      { status: 400 },
    );
  }

  const errors: string[] = [];
  const normalized: PlayerImportRow[] = [];
  const hasActiveColumn = csvHasActiveColumn(rows);
  const hasLinkColumn = csvHasLinkColumn(rows);

  for (const [index, row] of rows.entries()) {
    const firstName = normalizePersonName(getFirstName(row));
    const lastName = normalizePersonName(getLastName(row));
    const linkRaw = hasLinkColumn ? getLinkRaw(row) : "";
    const rowLabel = `Row ${index + 2}`;

    if (!firstName || !lastName) {
      errors.push(`${rowLabel}: missing first or last name`);
      continue;
    }

    let link: string | null | undefined;
    if (!hasLinkColumn || !linkRaw) {
      // No link column or empty cell: keep existing link for matched players.
      link = undefined;
    } else {
      const parsedLink = parseOptionalLink(linkRaw);
      if (!parsedLink) {
        link = undefined;
        errors.push(
          `${rowLabel} (${firstName} ${lastName}): invalid link URL — active/name still updated, link left unchanged`,
        );
      } else {
        link = parsedLink;
      }
    }

    let active = true;
    if (hasActiveColumn) {
      const parsedActive = parseActiveFlag(getActiveRaw(row));
      if (parsedActive === null) {
        errors.push(`${rowLabel} (${firstName} ${lastName}): Active/Register must be Y or N`);
        continue;
      }
      active = parsedActive;
    }

    normalized.push({
      firstName,
      lastName,
      link,
      active,
    });
  }

  if (normalized.length === 0) {
    return NextResponse.json({ error: "No valid rows found", details: errors }, { status: 400 });
  }

  let updated = 0;
  let created = 0;

  await prisma.$transaction(async (tx) => {
    // Legacy files without an Active/Register column: soft-replace the active roster.
    // Files with Active/Register: only update listed players; leave others unchanged.
    if (!hasActiveColumn) {
      await tx.player.updateMany({
        where: { leagueId },
        data: { active: false },
      });
    }

    for (const row of normalized) {
      const existing = await tx.player.findFirst({
        where: {
          leagueId,
          firstName: { equals: row.firstName, mode: "insensitive" },
          lastName: { equals: row.lastName, mode: "insensitive" },
        },
      });
      if (existing) {
        await tx.player.update({
          where: { id: existing.id },
          data: {
            firstName: row.firstName,
            lastName: row.lastName,
            active: row.active,
            ...(row.link !== undefined ? { link: row.link } : {}),
          },
        });
        updated += 1;
      } else {
        await tx.player.create({
          data: {
            leagueId,
            firstName: row.firstName,
            lastName: row.lastName,
            link: row.link ?? null,
            active: row.active,
          },
        });
        created += 1;
      }
    }
  });

  await syncCollectedSubmissionsForNewPlayers(leagueId);

  const wantsJson = request.headers.get("accept")?.includes("application/json");
  if (wantsJson) {
    return NextResponse.json({
      ok: true,
      updated,
      created,
      processed: normalized.length,
      recognizedActiveColumn: hasActiveColumn,
      recognizedLinkColumn: hasLinkColumn,
      warnings: errors,
    });
  }

  const redirectParams: Record<string, string> = {};
  if (errors.length) {
    redirectParams.importWarnings = String(errors.length);
  }
  return backendRedirectForLeague(request, auth.session.leagueId, redirectParams);
}
