import type { Metadata } from "next";
import { findLeagueBySlug } from "@/lib/league";

type Props = {
  children: React.ReactNode;
  params: Promise<{ leagueSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await findLeagueBySlug(leagueSlug);
  if (!league) {
    return { title: "Player ratings" };
  }
  return { title: `${league.name} player ratings` };
}

export default function LeagueLayout({ children }: Props) {
  return children;
}
