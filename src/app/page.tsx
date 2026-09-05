import { redirect } from "next/navigation";
import { resolveSession } from "@/lib/auth";
import { getLeagueById } from "@/lib/league";
import { leaguePath } from "@/lib/league-routes";

export default async function Home() {
  const session = await resolveSession();
  if (!session) redirect("/login");
  const league = await getLeagueById(session.leagueId);
  if (!league) redirect("/login");
  redirect(leaguePath(league.slug, "/rate"));
}
