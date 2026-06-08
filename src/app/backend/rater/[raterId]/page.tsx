import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { RaterScoresTable } from "@/components/rater-scores-table";
import { ScrollableListCard } from "@/components/scrollable-list-card";
import { resolveSession } from "@/lib/auth";
import { getRaterProgress } from "@/lib/completion";
import { prisma } from "@/lib/db";
import { formatRaterExportFilename } from "@/lib/rater-export";
import { getAppNavData } from "@/lib/nav";
import { isBackendUser } from "@/lib/rbac";
import { getLatestRaterSubmission } from "@/lib/rater-submission";

export default async function RaterPreviewPage({
  params,
}: {
  params: Promise<{ raterId: string }>;
}) {
  const session = await resolveSession();
  if (!session) redirect("/login");
  if (!isBackendUser(session)) redirect("/rate");

  const { raterId } = await params;
  const [rater, submission, activePlayers] = await Promise.all([
    prisma.rater.findUnique({ where: { id: raterId } }),
    getLatestRaterSubmission(raterId),
    prisma.player.findMany({
      where: { active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  if (!rater) redirect("/backend");

  const ratingByPlayerId = new Map(
    (submission?.ratings ?? []).map((rating) => [rating.playerId, rating]),
  );
  const activePlayerIds = activePlayers.map((player) => player.id);
  const activePlayersCount = activePlayers.length;
  const progress = getRaterProgress(
    submission?.ratings ?? [],
    activePlayersCount,
    activePlayerIds,
  );
  const exportFilename = formatRaterExportFilename(
    rater.name,
    submission?.submittedAt ?? submission?.updatedAt,
  );
  const nav = await getAppNavData(session);

  return (
    <main className="min-w-0 overflow-x-hidden bg-white text-zinc-900">
      <AppNav {...nav} />
      <section className="mx-auto min-w-0 max-w-7xl space-y-4 px-3 py-6 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link className="text-sm text-blue-700 underline" href="/backend">
              ← Back to admin
            </Link>
            <h1 className="mt-2 text-2xl font-semibold">{rater.name}</h1>
            <p className="text-sm text-zinc-600">{rater.email}</p>
          </div>
          {submission && progress.hasAnySavedRows ? (
            <a
              className={`rounded px-3 py-2 text-sm font-medium text-white ${
                progress.isFullyComplete ? "bg-blue-600 hover:bg-blue-700" : "bg-zinc-600 hover:bg-zinc-700"
              }`}
              href={`/api/admin/export/rater/${rater.id}`}
            >
              Download CSV
            </a>
          ) : null}
        </div>

        <p className="text-sm text-zinc-700">
          {progress.isFullyComplete ? (
            <span className="inline-flex items-center gap-1 font-medium">
              Complete <span aria-hidden="true">✅</span>
            </span>
          ) : (
            <>
              {progress.enteredCount}/{activePlayersCount} entered · {progress.incompleteCount}{" "}
              incomplete
            </>
          )}
        </p>

        {!submission || !progress.hasAnySavedRows ? (
          <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            No scores saved yet for this rater.
          </p>
        ) : (
          <ScrollableListCard title="Players" maxHeightClass="max-h-[75vh]">
            <RaterScoresTable
              rows={activePlayers.map((player) => ({
                playerId: player.id,
                firstName: player.firstName,
                lastName: player.lastName,
                link: player.link,
                rating: ratingByPlayerId.get(player.id) ?? null,
              }))}
            />
          </ScrollableListCard>
        )}

        <p className="text-xs text-zinc-500">Export filename: {exportFilename}</p>
      </section>
    </main>
  );
}
