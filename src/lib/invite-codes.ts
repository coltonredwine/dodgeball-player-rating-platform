import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

function defaultExpiry() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date;
}

export async function rotateRaterPasscode(
  raterId: string,
  passcode: string,
  expiresAt?: Date,
) {
  const codeHash = await bcrypt.hash(passcode, 10);
  const expiry = expiresAt ?? defaultExpiry();

  if (expiry <= new Date()) {
    throw new Error("Expires At must be in the future");
  }

  await prisma.$transaction([
    prisma.inviteCode.updateMany({
      where: { raterId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.inviteCode.create({
      data: {
        raterId,
        codeHash,
        expiresAt: expiry,
      },
    }),
    prisma.rater.update({
      where: { id: raterId },
      data: { passcodeDisplay: passcode },
    }),
  ]);
}
