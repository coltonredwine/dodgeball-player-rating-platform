import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_LEAGUE_ID = "cldefaultstonewall00001";
const DEFAULT_LEAGUE_SLUG = "stonewall";
const DEFAULT_LEAGUE_NAME = "Stonewall";

async function main() {
  const superadminEmail = (process.env.SUPERADMIN_EMAIL || "coltonredwine@gmail.com").toLowerCase();

  const league = await prisma.league.upsert({
    where: { slug: DEFAULT_LEAGUE_SLUG },
    update: { name: DEFAULT_LEAGUE_NAME },
    create: {
      id: DEFAULT_LEAGUE_ID,
      name: DEFAULT_LEAGUE_NAME,
      slug: DEFAULT_LEAGUE_SLUG,
    },
  });

  await prisma.rater.upsert({
    where: { leagueId_email: { leagueId: league.id, email: superadminEmail } },
    update: {
      name: "Superadmin",
      role: "admin",
      active: true,
    },
    create: {
      leagueId: league.id,
      email: superadminEmail,
      name: "Superadmin",
      role: "admin",
      active: true,
    },
  });

  await prisma.appSetting.upsert({
    where: { leagueId_key: { leagueId: league.id, key: "scoring_open" } },
    update: {},
    create: { leagueId: league.id, key: "scoring_open", value: "true" },
  });

  await prisma.appSetting.upsert({
    where: { leagueId_key: { leagueId: league.id, key: "season_label" } },
    update: {},
    create: { leagueId: league.id, key: "season_label", value: "Current Season" },
  });

  console.log(
    `Setup complete: league "${league.slug}", superadmin rater, and default app settings initialized.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
