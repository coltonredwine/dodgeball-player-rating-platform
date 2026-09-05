import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/api-auth";
import { createLeague, listLeagues } from "@/lib/league";

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const leagues = await listLeagues();
  return NextResponse.json({
    leagues: leagues.map((league) => ({
      id: league.id,
      name: league.name,
      slug: league.slug,
      createdAt: league.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const body = (await request.json()) as { name?: string; slug?: string };

  try {
    const league = await createLeague({
      name: body.name ?? "",
      slug: body.slug ?? "",
    });
    return NextResponse.json({
      league: {
        id: league.id,
        name: league.name,
        slug: league.slug,
        createdAt: league.createdAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create league";
    const status = message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
