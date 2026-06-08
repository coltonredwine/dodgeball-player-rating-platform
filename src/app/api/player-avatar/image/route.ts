import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import {
  fetchInstagramProfileImage,
  fetchInstagramProfileImageBytes,
  isInstagramProfileUrl,
} from "@/lib/player-avatar";

const DEFAULT_AVATAR_PATH = path.join(process.cwd(), "public/images/default-avatar.png");

async function defaultAvatarResponse() {
  const bytes = await readFile(DEFAULT_AVATAR_PATH);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
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
    return defaultAvatarResponse();
  }

  try {
    const imageUrl = await fetchInstagramProfileImage(link);
    if (!imageUrl) {
      return defaultAvatarResponse();
    }

    const imageResponse = await fetchInstagramProfileImageBytes(imageUrl);
    if (!imageResponse?.body) {
      return defaultAvatarResponse();
    }

    const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
    return new NextResponse(imageResponse.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return defaultAvatarResponse();
  }
}
