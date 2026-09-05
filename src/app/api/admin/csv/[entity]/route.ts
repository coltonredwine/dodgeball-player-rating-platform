import { requireSuperadmin } from "@/lib/api-auth";
import {
  PLAYER_IMPORT_HEADERS,
  RATER_IMPORT_HEADERS,
  csvDownloadResponse,
  rowsToCsv,
} from "@/lib/csv";
import { prisma } from "@/lib/db";

type Kind = "current" | "template";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ entity: string }> },
) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const leagueId = auth.session.leagueId;
  const { entity } = await params;
  const kind = new URL(request.url).searchParams.get("kind") as Kind | null;

  if (entity !== "players" && entity !== "raters") {
    return new Response(JSON.stringify({ error: "Unknown entity" }), { status: 404 });
  }
  if (kind !== "current" && kind !== "template") {
    return new Response(JSON.stringify({ error: "kind must be current or template" }), {
      status: 400,
    });
  }

  if (entity === "players") {
    const headers = [...PLAYER_IMPORT_HEADERS];
    if (kind === "template") {
      return csvDownloadResponse("players-template.csv", rowsToCsv(headers, []));
    }

    const players = await prisma.player.findMany({
      where: { leagueId, active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    const rows = players.map((p) => [p.firstName, p.lastName, p.link ?? ""]);
    return csvDownloadResponse("players-current.csv", rowsToCsv(headers, rows));
  }

  const headers = [...RATER_IMPORT_HEADERS];
  if (kind === "template") {
    return csvDownloadResponse("raters-template.csv", rowsToCsv(headers, []));
  }

  const raters = await prisma.rater.findMany({
    where: { leagueId, active: true },
    orderBy: { name: "asc" },
  });
  const rows = raters.map((r) => [r.name, r.email, r.role, "", ""]);
  return csvDownloadResponse("raters-current.csv", rowsToCsv(headers, rows));
}
