import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const superadminEmail = process.env.SUPERADMIN_EMAIL || "coltonredwine@gmail.com";

  await prisma.rater.upsert({
    where: { email: superadminEmail.toLowerCase() },
    update: {
      name: "Superadmin",
      isAdmin: true,
      active: true,
    },
    create: {
      email: superadminEmail.toLowerCase(),
      name: "Superadmin",
      isAdmin: true,
      active: true,
    },
  });

  await prisma.appSetting.upsert({
    where: { key: "scoring_open" },
    update: {},
    create: { key: "scoring_open", value: "true" },
  });

  await prisma.appSetting.upsert({
    where: { key: "season_label" },
    update: {},
    create: { key: "season_label", value: "Current Season" },
  });

  console.log("Setup complete: superadmin rater + default app settings initialized.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
