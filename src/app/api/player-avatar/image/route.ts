import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  fetchInstagramProfileImage,
  fetchInstagramProfileImageBytes,
  isInstagramProfileUrl,
  normalizeProfileLink,
  profileLinksMatch,
} from "@/lib/player-avatar";

export const dynamic = "force-dynamic";

const DEFAULT_AVATAR_PATH = path.join(process.cwd(), "public/images/default-avatar.png");
let defaultAvatarCache: { bytes: Uint8Array; contentType: string } | null = null;

async function defaultAvatarResponse() {
  if (!defaultAvatarCache) {
    defaultAvatarCache = {
      bytes: new Uint8Array(await readFile(DEFAULT_AVATAR_PATH)),
      contentType: "image/png",
    };
  }

  return new NextResponse(defaultAvatarCache.bytes as BodyInit, {
    headers: {
      "Content-Type": defaultAvatarCache.contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

function cachedAvatarResponse(bytes: Buffer, contentType: string | null | undefined) {
  return new NextResponse(bytes as BodyInit, {
    headers: {
      "Content-Type": contentType ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

async function persistPlayerAvatar(
  playerId: string,
  bytes: Uint8Array,
  contentType: string,
) {
  await prisma.player.update({
    where: { id: playerId },
    data: {
      avatarImage: Buffer.from(bytes),
      avatarImageContentType: contentType,
      avatarImageFetchedAt: new Date(),
    },
  });
}

async function resolveRemoteAvatarBytes(link: string) {
  const imageUrl = await fetchInstagramProfileImage(link);
  if (!imageUrl) return null;

  const imageResponse = await fetchInstagramProfileImageBytes(imageUrl);
  if (!imageResponse?.body) return null;

  const bytes = new Uint8Array(await imageResponse.arrayBuffer());
  if (bytes.length === 0) return null;

  const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
  return { bytes, contentType };
}

type AvatarPlayer = {
  id: string;
  link: string | null;
  avatarImage: Buffer | Uint8Array | null;
  avatarImageContentType: string | null;
};

const avatarPlayerSelect = {
  id: true,
  link: true,
  avatarImage: true,
  avatarImageContentType: true,
} as const;

async function findPlayerById(playerId: string): Promise<AvatarPlayer | null> {
  return prisma.player.findUnique({
    where: { id: playerId },
    select: avatarPlayerSelect,
  });
}

async function findPlayerByLink(link: string): Promise<AvatarPlayer | null> {
  const trimmed = link.trim();
  const exact = await prisma.player.findFirst({
    where: { link: trimmed },
    select: avatarPlayerSelect,
  });
  if (exact) return exact;

  const normalized = normalizeProfileLink(trimmed);
  const candidates = await prisma.player.findMany({
    where: { link: { not: null } },
    select: avatarPlayerSelect,
  });

  return candidates.find((player) => player.link && profileLinksMatch(player.link, trimmed)) ?? null;
}

function avatarBytes(player: AvatarPlayer): Buffer | null {
  if (player.avatarImage == null) return null;

  if (Buffer.isBuffer(player.avatarImage)) {
    return player.avatarImage.length > 0 ? player.avatarImage : null;
  }

  if (player.avatarImage instanceof Uint8Array) {
    return player.avatarImage.length > 0 ? Buffer.from(player.avatarImage) : null;
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");
  const link = searchParams.get("link");

  if (!playerId && !link) {
    return NextResponse.json({ error: "Missing playerId or link" }, { status: 400 });
  }

  try {
    const player = playerId
      ? await findPlayerById(playerId)
      : link
        ? await findPlayerByLink(link)
        : null;

    const cached = player ? avatarBytes(player) : null;
    if (cached) {
      return cachedAvatarResponse(cached, player?.avatarImageContentType);
    }

    const resolvedLink = link?.trim() ?? player?.link ?? null;
    if (!resolvedLink || !isInstagramProfileUrl(resolvedLink)) {
      return defaultAvatarResponse();
    }

    const remote = await resolveRemoteAvatarBytes(resolvedLink);
    if (!remote) {
      return defaultAvatarResponse();
    }

    if (player) {
      await persistPlayerAvatar(player.id, remote.bytes, remote.contentType);
    }

    return cachedAvatarResponse(Buffer.from(remote.bytes), remote.contentType);
  } catch {
    return defaultAvatarResponse();
  }
}
