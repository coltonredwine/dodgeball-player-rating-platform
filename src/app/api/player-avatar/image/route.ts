import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  fetchInstagramProfileImage,
  fetchInstagramProfileImageBytes,
  isInstagramProfileUrl,
} from "@/lib/player-avatar";

export const dynamic = "force-dynamic";

function defaultAvatarRedirect(request: Request) {
  return NextResponse.redirect(new URL("/images/default-avatar.png", request.url), 302);
}

function cachedAvatarResponse(
  bytes: Uint8Array,
  contentType: string | null | undefined,
) {
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

export async function GET(request: Request) {
  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const link = searchParams.get("link");
  if (!link) {
    return NextResponse.json({ error: "Missing link" }, { status: 400 });
  }

  if (!isInstagramProfileUrl(link)) {
    return defaultAvatarRedirect(request);
  }

  try {
    const player = await prisma.player.findFirst({
      where: { link },
      select: {
        id: true,
        avatarImage: true,
        avatarImageContentType: true,
      },
    });

    if (player?.avatarImage) {
      return cachedAvatarResponse(
        new Uint8Array(player.avatarImage),
        player.avatarImageContentType,
      );
    }

    const remote = await resolveRemoteAvatarBytes(link);
    if (!remote) {
      return defaultAvatarRedirect(request);
    }

    if (player) {
      await persistPlayerAvatar(player.id, remote.bytes, remote.contentType);
    }

    return cachedAvatarResponse(remote.bytes, remote.contentType);
  } catch {
    return defaultAvatarRedirect(request);
  }
}
