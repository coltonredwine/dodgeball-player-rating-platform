import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { RatingGuideModal } from "@/components/rating-guide-modal";
import { RatingGrid } from "@/components/rating-grid";
import { prisma } from "@/lib/db";
import { requireLeaguePageSession, leaguePath } from "@/lib/league-routes";
import { getAppNavData } from "@/lib/nav";
import { getOrCreateSubmission } from "@/lib/rating";
import {
  isRaterScoringLocked,
  syncCollectedSubmissionsForNewPlayers,
} from "@/lib/collection";
import { isScoringOpen } from "@/lib/scoring-window";
import {
  RATE_PAGE_BUTTON_TITLE_KEY,
  RATE_PAGE_BUTTON_URL_KEY,
  RATE_PAGE_TITLE_KEY,
  getStringSetting,
} from "@/lib/settings";

export default async function RatePage({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}) {
  const { leagueSlug } = await params;
  const { session, league } = await requireLeaguePageSession(leagueSlug);

  if (!session.raterId && session.role !== "superadmin") {
    redirect(leaguePath(league.slug, "/login"));
  }

  const leagueId = session.leagueId;
  const [scoringOpen, ratePageTitle, rateButtonTitle, rateButtonUrl] = await Promise.all([
    isScoringOpen(leagueId),
    getStringSetting(leagueId, RATE_PAGE_TITLE_KEY, ""),
    getStringSetting(leagueId, RATE_PAGE_BUTTON_TITLE_KEY, ""),
    getStringSetting(leagueId, RATE_PAGE_BUTTON_URL_KEY, ""),
  ]);
  const showRateButton = Boolean(rateButtonTitle && rateButtonUrl);
  const pageTitle = ratePageTitle.trim() || "Rate Players";

  const players = await prisma.player.findMany({
    where: { leagueId, active: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  await syncCollectedSubmissionsForNewPlayers(leagueId, players.length);

  const raterId =
    session.role === "superadmin"
      ? (
          await prisma.rater.upsert({
            where: { leagueId_email: { leagueId, email: session.email } },
            update: { name: "Superadmin", role: "admin", active: true },
            create: {
              leagueId,
              email: session.email,
              name: "Superadmin",
              role: "admin",
              active: true,
            },
          })
        ).id
      : session.raterId!;

  const submission = await getOrCreateSubmission(raterId, leagueId);
  const scoringLocked = isRaterScoringLocked(submission, scoringOpen);
  const collectedLocked =
    submission.collectionStatus === "collected" && scoringOpen && !submission.adminLocked;
  const adminLocked = submission.adminLocked && scoringOpen;
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

  const nav = await getAppNavData(session);

  return (
    <main className="min-w-0 overflow-x-hidden bg-white text-zinc-900">
      <AppNav {...nav} />
      <section className="mx-auto min-w-0 max-w-7xl px-3 py-6 sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">{pageTitle}</h1>
          {showRateButton ? (
            <a
              href={rateButtonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {rateButtonTitle}
            </a>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-zinc-600">
          Your progress is saved automatically. If you log out and return later, your scores will
          still be here.
        </p>
        <RatingGuideModal userKey={session.email} />
        {!scoringOpen && (
          <p className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Scoring is currently closed. Ratings are read-only.
          </p>
        )}
        {collectedLocked ? (
          <p className="mt-2 rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900">
            Your scores have been collected and are read-only.
          </p>
        ) : null}
        {adminLocked ? (
          <p className="mt-2 rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
            Your score sheet has been locked and is read-only.
          </p>
        ) : null}
        <div className="mt-4">
          <RatingGrid submissionId={submission.id} locked={scoringLocked} initialRows={initialRows} />
        </div>
      </section>
    </main>
  );
}
