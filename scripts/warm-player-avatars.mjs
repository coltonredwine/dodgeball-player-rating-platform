import { PrismaClient } from "@prisma/client";
import {
  fetchInstagramProfileImage,
  fetchInstagramProfileImageBytes,
  isInstagramProfileUrl,
} from "../src/lib/player-avatar.ts";

const prisma = new PrismaClient();

async function warmPlayer(player) {
  if (!player.link || !isInstagramProfileUrl(player.link)) {
    return { playerId: player.id, status: "skipped", reason: "no instagram link" };
  }

  if (player.avatarImage) {
    return { playerId: player.id, status: "skipped", reason: "already cached" };
  }

  const imageUrl = await fetchInstagramProfileImage(player.link);
  if (!imageUrl) {
    return { playerId: player.id, status: "failed", reason: "profile image url not found" };
  }

  const imageResponse = await fetchInstagramProfileImageBytes(imageUrl);
  if (!imageResponse?.body) {
    return { playerId: player.id, status: "failed", reason: "image bytes not found" };
  }

  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";

  await prisma.player.update({
    where: { id: player.id },
    data: {
      avatarImage: bytes,
      avatarImageContentType: contentType,
      avatarImageFetchedAt: new Date(),
    },
  });

  return {
    playerId: player.id,
    status: "cached",
    name: `${player.firstName} ${player.lastName}`,
    bytes: bytes.length,
  };
}

const players = await prisma.player.findMany({
  where: { link: { not: null } },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    link: true,
    avatarImage: true,
  },
  orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
});

const results = [];
for (const player of players) {
  results.push(await warmPlayer(player));
}

const summary = results.reduce(
  (acc, result) => {
    acc[result.status] = (acc[result.status] ?? 0) + 1;
    return acc;
  },
  {},
);

console.log(JSON.stringify({ summary, results }, null, 2));

await prisma.$disconnect();
