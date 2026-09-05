import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/api-auth";
import { parseCsv, parseOptionalLink } from "@/lib/csv";
import { backendRedirectForLeague } from "@/lib/request-url";
import { syncCollectedSubmissionsForNewPlayers } from "@/lib/collection";

type PlayerImportRow = {
  firstName: string;
  lastName: string;
  link: string | null;
};

function getLink(row: Record<string, string>) {
  return (row["Link"] ?? row["link"] ?? row["URL"] ?? row["url"] ?? "").trim();
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

  const text = await file.text();
  const rows = parseCsv(text);
  const errors: string[] = [];
  const normalized: PlayerImportRow[] = [];

  for (const [index, row] of rows.entries()) {
    const firstName = (row["First Name"] ?? row["First"] ?? row["first_name"] ?? "").trim();
    const lastName = (row["Last Name"] ?? row["Last"] ?? row["last_name"] ?? "").trim();
    const linkRaw = getLink(row);

    if (!firstName || !lastName) {
      errors.push(`Row ${index + 2}: missing first or last name`);
      continue;
    }

    const link = linkRaw ? parseOptionalLink(linkRaw) : null;
    if (linkRaw && !link) {
      errors.push(`Row ${index + 2}: invalid Link URL`);
      continue;
    }

    normalized.push({
      firstName,
      lastName,
      link,
    });
  }

  if (normalized.length === 0) {
    return NextResponse.json({ error: "No valid rows found", details: errors }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.player.updateMany({
      where: { leagueId },
      data: { active: false },
    });

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
            link: row.link,
            active: true,
          },
        });
      } else {
        await tx.player.create({
          data: {
            leagueId,
            firstName: row.firstName,
            lastName: row.lastName,
            link: row.link,
            active: true,
          },
        });
      }
    }
  });

  await syncCollectedSubmissionsForNewPlayers(leagueId, normalized.length);

  const redirectParams: Record<string, string> = {};
  if (errors.length) {
    redirectParams.importWarnings = String(errors.length);
  }
  return backendRedirectForLeague(request, auth.session.leagueId, redirectParams);
}
