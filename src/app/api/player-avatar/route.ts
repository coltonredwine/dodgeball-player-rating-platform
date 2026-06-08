import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";
import { fetchInstagramProfileImage, isInstagramProfileUrl } from "@/lib/player-avatar";

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
    return NextResponse.json({ imageUrl: null });
  }

  try {
    const imageUrl = await fetchInstagramProfileImage(link);
    return NextResponse.json({ imageUrl });
  } catch {
    return NextResponse.json({ imageUrl: null });
  }
}
