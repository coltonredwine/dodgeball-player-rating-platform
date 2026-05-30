import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const MIGRATIONS = [
  "20260528042325_init",
  "20260528120000_rater_role",
  "20260528130000_player_link_passcode_display",
];

function run(command) {
  console.log(`> ${command}`);
  execSync(command, { stdio: "inherit" });
}

async function tableExists(prisma, table) {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${table}
    ) AS "exists"
  `;
  return rows[0]?.exists ?? false;
}

async function columnExists(prisma, table, column) {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS "exists"
  `;
  return rows[0]?.exists ?? false;
}

async function migrationApplied(prisma, migration) {
  if (!(await tableExists(prisma, "_prisma_migrations"))) return false;

  const rows = await prisma.$queryRaw`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL
  `;

  return rows.some((row) => row.migration_name === migration);
}

async function resolveApplied(prisma, migration) {
  if (await migrationApplied(prisma, migration)) return;
  console.log(`Marking migration as already applied: ${migration}`);
  run(`npx prisma migrate resolve --applied ${migration}`);
}

async function baselineExistingDatabase(prisma) {
  const hasPlayer = await tableExists(prisma, "Player");
  if (!hasPlayer) return;

  console.log("Existing database detected — baselining Prisma Migrate history.");

  await resolveApplied(prisma, MIGRATIONS[0]);

  if (await columnExists(prisma, "Rater", "role")) {
    await resolveApplied(prisma, MIGRATIONS[1]);
  }

  if (
    (await columnExists(prisma, "Player", "link")) &&
    (await columnExists(prisma, "Rater", "passcodeDisplay"))
  ) {
    await resolveApplied(prisma, MIGRATIONS[2]);
  }
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await baselineExistingDatabase(prisma);
    run("npx prisma migrate deploy");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
