import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/api-auth";
import { parseCsv } from "@/lib/csv";
import { backendRedirect } from "@/lib/request-url";

type PlayerImportRow = { firstName: string; lastName: string };

export async function POST(request: Request) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);
  const errors: string[] = [];
  const normalized: PlayerImportRow[] = rows
    .map((row: Record<string, string>, index: number) => {
      const firstName = (row["First Name"] ?? row["First"] ?? row["first_name"] ?? "").trim();
      const lastName = (row["Last Name"] ?? row["Last"] ?? row["last_name"] ?? "").trim();
      if (!firstName || !lastName) {
        errors.push(`Row ${index + 2}: missing first or last name`);
      }
      return { firstName, lastName };
    })
    .filter((row: PlayerImportRow) => row.firstName && row.lastName);

  if (normalized.length === 0) {
    return NextResponse.json({ error: "No valid rows found", details: errors }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.player.updateMany({ data: { active: false } }),
    ...normalized.map((row) =>
      prisma.player.upsert({
        where: {
          id: `${row.firstName.toLowerCase()}-${row.lastName.toLowerCase()}`,
        },
        update: { firstName: row.firstName, lastName: row.lastName, active: true },
        create: {
          id: `${row.firstName.toLowerCase()}-${row.lastName.toLowerCase()}`,
          firstName: row.firstName,
          lastName: row.lastName,
          active: true,
        },
      }),
    ),
  ]);

  const redirectParams: Record<string, string> = {};
  if (errors.length) {
    redirectParams.importWarnings = String(errors.length);
  }
  return backendRedirect(request, redirectParams);
}
