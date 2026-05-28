import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/api-auth";
import { parseCsv } from "@/lib/csv";

type RaterImportRow = { name: string; email: string; isAdmin: boolean };

function toBoolean(input: string) {
  const value = input.trim().toLowerCase();
  return value === "true" || value === "yes" || value === "1";
}

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
  const normalized: RaterImportRow[] = rows
    .map((row: Record<string, string>, index: number) => {
      const name = (row["Name"] ?? "").trim();
      const email = (row["Email"] ?? "").trim().toLowerCase();
      const adminValue = (row["is_admin"] ?? row["Admin"] ?? "").trim();
      if (!name || !email) {
        errors.push(`Row ${index + 2}: missing name or email`);
      }
      return { name, email, isAdmin: adminValue ? toBoolean(adminValue) : false };
    })
    .filter((row: RaterImportRow) => row.name && row.email);

  if (normalized.length === 0) {
    return NextResponse.json({ error: "No valid rows found", details: errors }, { status: 400 });
  }

  await prisma.$transaction(
    normalized.map((row) =>
      prisma.rater.upsert({
        where: { email: row.email },
        update: { name: row.name, isAdmin: row.isAdmin, active: true },
        create: { name: row.name, email: row.email, isAdmin: row.isAdmin, active: true },
      }),
    ),
  );

  const redirectUrl = new URL("/backend", request.url);
  if (errors.length) {
    redirectUrl.searchParams.set("importWarnings", String(errors.length));
  }
  return NextResponse.redirect(redirectUrl);
}
