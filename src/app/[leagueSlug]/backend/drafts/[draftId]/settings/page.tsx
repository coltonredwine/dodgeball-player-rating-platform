import { redirect } from "next/navigation";
import { leaguePath } from "@/lib/league-routes";

export default async function DraftSettingsPage({
  params,
}: {
  params: Promise<{ leagueSlug: string; draftId: string }>;
}) {
  const { leagueSlug, draftId } = await params;
  redirect(`${leaguePath(leagueSlug, `/backend/drafts/${draftId}`)}?settings=1`);
}
