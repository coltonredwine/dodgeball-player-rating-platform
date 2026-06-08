import { redirect } from "next/navigation";
import { DraftBoardView } from "@/components/draft-board-view";
import { DRAFT_ROOM_DARK } from "@/lib/draft-room-theme";
import { resolveSession } from "@/lib/auth";

export default async function DraftBoardPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const session = await resolveSession();
  if (!session) redirect("/login");

  const { draftId } = await params;

  return (
    <main className={`${DRAFT_ROOM_DARK.page} flex h-dvh flex-col overflow-hidden`}>
      <section className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col px-6 py-4">
        <DraftBoardView draftId={draftId} mode="board" />
      </section>
    </main>
  );
}
