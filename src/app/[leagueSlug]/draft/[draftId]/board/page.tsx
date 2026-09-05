import { redirect } from "next/navigation";
import { DraftBoardView } from "@/components/draft-board-view";
import { DRAFT_ROOM_DARK } from "@/lib/draft-room-theme";
import { prisma } from "@/lib/db";
import { requireLeaguePageSession, leaguePath } from "@/lib/league-routes";

export default async function DraftBoardPage({
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
  if (!draft) redirect(leaguePath(league.slug, "/draft"));

  return (
    <main className={`${DRAFT_ROOM_DARK.page} draft-tv-overscan flex h-dvh flex-col overflow-hidden`}>
      <section className="flex min-h-0 flex-1 flex-col">
        <DraftBoardView draftId={draftId} mode="board" />
      </section>
    </main>
  );
}
