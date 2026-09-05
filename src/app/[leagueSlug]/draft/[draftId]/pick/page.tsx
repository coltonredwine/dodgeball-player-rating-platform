import { redirect } from "next/navigation";
import { CaptainPickView } from "@/components/captain-pick-view";
import { DRAFT_ROOM_DARK } from "@/lib/draft-room-theme";
import { prisma } from "@/lib/db";
import { requireLeaguePageSession, leaguePath } from "@/lib/league-routes";
import { getAppNavData } from "@/lib/nav";

export default async function CaptainPickPage({
  params,
}: {
  params: Promise<{ leagueSlug: string; draftId: string }>;
}) {
  const { leagueSlug, draftId } = await params;
  const { session, league } = await requireLeaguePageSession(leagueSlug);

  const draft = await prisma.draft.findFirst({
    where: { id: draftId, leagueId: session.leagueId },
    select: { id: true },
  });
  if (!draft) redirect(leaguePath(league.slug, "/rate"));

  if (session.raterId) {
    const team = await prisma.draftTeam.findFirst({
      where: { draftId, raterId: session.raterId },
    });
    if (!team && session.role !== "admin" && session.role !== "superadmin") {
      redirect(leaguePath(league.slug, "/rate"));
    }
  }

  const nav = await getAppNavData(session);

  return (
    <main className={`min-w-0 ${DRAFT_ROOM_DARK.page}`}>
      <CaptainPickView draftId={draftId} nav={nav} />
    </main>
  );
}
