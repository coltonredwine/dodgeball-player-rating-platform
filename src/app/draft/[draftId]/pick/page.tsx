import { redirect } from "next/navigation";
import { CaptainPickView } from "@/components/captain-pick-view";
import { DRAFT_ROOM_DARK } from "@/lib/draft-room-theme";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAppNavData } from "@/lib/nav";

export default async function CaptainPickPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const session = await resolveSession();
  if (!session) redirect("/login");

  const { draftId } = await params;

  if (session.raterId) {
    const team = await prisma.draftTeam.findFirst({
      where: { draftId, raterId: session.raterId },
    });
    if (!team && session.role !== "admin" && session.role !== "superadmin") {
      redirect("/rate");
    }
  }

  const nav = await getAppNavData(session);

  return (
    <main className={`min-w-0 ${DRAFT_ROOM_DARK.page}`}>
      <CaptainPickView draftId={draftId} nav={nav} />
    </main>
  );
}
