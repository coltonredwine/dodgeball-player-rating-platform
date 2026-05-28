import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/api-auth";
import { rowsToCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(request: Request) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const formData = await request.formData();
  const expiresAtRaw = String(formData.get("expiresAt") || "");
  const expiresAt = new Date(expiresAtRaw);
  if (Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
  }

  const raters = await prisma.rater.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const rows: Array<Array<string>> = [];
  for (const rater of raters) {
    const code = randomCode();
    await prisma.inviteCode.create({
      data: {
        raterId: rater.id,
        codeHash: await bcrypt.hash(code, 10),
        expiresAt,
      },
    });
    rows.push([rater.name, rater.email, code, expiresAt.toISOString()]);
  }

  const csv = rowsToCsv(["Name", "Email", "Passcode", "Expires At"], rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="invite-passcodes.csv"`,
    },
  });
}
