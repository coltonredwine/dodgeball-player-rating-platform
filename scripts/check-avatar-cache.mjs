import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const withLink = await prisma.player.count({ where: { link: { not: null } } });
const cached = await prisma.player.count({ where: { avatarImage: { not: null } } });
const sample = await prisma.player.findFirst({
  where: { avatarImage: { not: null } },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    avatarImageContentType: true,
  },
});

console.log(
  JSON.stringify(
    {
      database: process.env.DATABASE_URL?.replace(/\/\/.*@/, "//***@") ?? "(missing DATABASE_URL)",
      playersWithLink: withLink,
      playersWithCachedAvatar: cached,
      sampleCachedPlayer: sample,
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
