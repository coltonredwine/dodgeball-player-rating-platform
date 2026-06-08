import { DraftBoardView } from "@/components/draft-board-view";
import { DRAFT_ROOM_DARK } from "@/lib/draft-room-theme";

export default async function PublicDraftBoardPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;

  return (
    <main className={`${DRAFT_ROOM_DARK.page} draft-tv-overscan flex h-dvh flex-col overflow-hidden`}>
      <section className="flex min-h-0 flex-1 flex-col">
        <DraftBoardView draftId={draftId} mode="public" />
      </section>
    </main>
  );
}
