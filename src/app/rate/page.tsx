import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { RatingGuideModal } from "@/components/rating-guide-modal";
import { RatingGrid } from "@/components/rating-grid";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateSubmission } from "@/lib/rating";
import { getBooleanSetting } from "@/lib/settings";

export default async function RatePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!session.raterId && session.role !== "superadmin") {
    redirect("/login");
  }

  const scoringOpen = await getBooleanSetting("scoring_open", true);
  const canSeeBackend = session.role === "admin" || session.role === "superadmin";

  const players = await prisma.player.findMany({
    where: { active: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const raterId =
    session.role === "superadmin"
      ? (
          await prisma.rater.upsert({
            where: { email: session.email },
            update: { name: "Superadmin", isAdmin: true, active: true },
            create: {
              email: session.email,
              name: "Superadmin",
              isAdmin: true,
              active: true,
            },
          })
        ).id
      : session.raterId!;

  const submission = await getOrCreateSubmission(raterId);
  const existing = await prisma.playerRating.findMany({
    where: { submissionId: submission.id },
  });

  const existingMap = new Map(existing.map((entry) => [entry.playerId, entry]));
  const initialRows = players.map((player) => {
    const row = existingMap.get(player.id);
    return {
      playerId: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      link: player.link,
      power: row?.power ?? null,
      accuracy: row?.accuracy ?? null,
      intimidation: row?.intimidation ?? null,
      catching: row?.catching ?? null,
      evasion: row?.evasion ?? null,
      nerve: row?.nerve ?? null,
      unknownPlayer: row?.unknownPlayer ?? false,
    };
  });

  return (
    <main>
      <AppNav canSeeBackend={canSeeBackend} displayName={session.name || session.email} />
      <section className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="text-2xl font-semibold">Rate Players</h1>
        <RatingGuideModal userKey={session.email} />
        {!scoringOpen && (
          <p className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Scoring is currently closed. Ratings are read-only.
          </p>
        )}
        <div className="mt-4">
          <RatingGrid submissionId={submission.id} locked={!scoringOpen} initialRows={initialRows} />
        </div>
      </section>
    </main>
  );
}
