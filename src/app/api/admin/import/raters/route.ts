import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/api-auth";
import { parseCsv } from "@/lib/csv";

type RaterImportRow = {
  name: string;
  email: string;
  isAdmin: boolean;
  passcode?: string;
  expiresAt?: Date;
};

function toBoolean(input: string) {
  const value = input.trim().toLowerCase();
  return value === "true" || value === "yes" || value === "1";
}

function getPasscode(row: Record<string, string>) {
  return (row["Passcode"] ?? row["passcode"] ?? "").trim();
}

function getExpiresAtRaw(row: Record<string, string>) {
  return (row["Expires At"] ?? row["ExpiresAt"] ?? row["expires_at"] ?? "").trim();
}

function parseExpiresAt(raw: string): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function defaultExpiry() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date;
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
  const normalized: RaterImportRow[] = [];

  for (const [index, row] of rows.entries()) {
    const name = (row["Name"] ?? "").trim();
    const email = (row["Email"] ?? "").trim().toLowerCase();
    const adminValue = (row["is_admin"] ?? row["Admin"] ?? "").trim();
    const passcode = getPasscode(row);
    const expiresRaw = getExpiresAtRaw(row);

    if (!name || !email) {
      errors.push(`Row ${index + 2}: missing name or email`);
      continue;
    }

    if (expiresRaw && !passcode) {
      errors.push(`Row ${index + 2}: Expires At requires a Passcode`);
      continue;
    }

    let expiresAt: Date | undefined;
    if (passcode) {
      const parsedExpiry = parseExpiresAt(expiresRaw);
      if (expiresRaw && !parsedExpiry) {
        errors.push(`Row ${index + 2}: invalid Expires At date`);
        continue;
      }
      expiresAt = parsedExpiry ?? defaultExpiry();
      if (expiresAt <= new Date()) {
        errors.push(`Row ${index + 2}: Expires At must be in the future`);
        continue;
      }
    }

    normalized.push({
      name,
      email,
      isAdmin: adminValue ? toBoolean(adminValue) : false,
      passcode: passcode || undefined,
      expiresAt,
    });
  }

  if (normalized.length === 0) {
    return NextResponse.json({ error: "No valid rows found", details: errors }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    for (const row of normalized) {
      const rater = await tx.rater.upsert({
        where: { email: row.email },
        update: { name: row.name, isAdmin: row.isAdmin, active: true },
        create: { name: row.name, email: row.email, isAdmin: row.isAdmin, active: true },
      });

      if (!row.passcode) continue;

      await tx.inviteCode.updateMany({
        where: { raterId: rater.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.inviteCode.create({
        data: {
          raterId: rater.id,
          codeHash: await bcrypt.hash(row.passcode, 10),
          expiresAt: row.expiresAt!,
        },
      });
    }
  });

  const redirectUrl = new URL("/backend", request.url);
  if (errors.length) {
    redirectUrl.searchParams.set("importWarnings", String(errors.length));
  }
  return NextResponse.redirect(redirectUrl);
}
