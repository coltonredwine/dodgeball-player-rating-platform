import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { getSession } from "@/lib/auth";
import { getRaterProgress } from "@/lib/completion";
import { METRIC_FIELDS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatRaterExportFilename } from "@/lib/rater-export";
import { isAdminLike } from "@/lib/rbac";
import { getLatestRaterSubmission } from "@/lib/rater-submission";

export default async function RaterPreviewPage({
  params,
}: {
  params: Promise<{ raterId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdminLike(session)) redirect("/rate");

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
  const activePlayersCount = activePlayers.length;
  const progress = getRaterProgress(
    submission?.ratings ?? [],
    activePlayersCount,
    submission?.submittedAt,
    submission?.status,
  );
  const exportFilename = formatRaterExportFilename(
    rater.name,
    submission?.submittedAt ?? submission?.updatedAt,
  );

  return (
    <main className="bg-white text-zinc-900">
      <AppNav canSeeBackend displayName={session.name || session.email} />
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link className="text-sm text-blue-700 underline" href="/backend">
              ← Back to backend
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
          {progress.isSubmittedComplete ? (
            <span className="inline-flex items-center gap-1 font-medium">
              Complete <span aria-hidden="true">✅</span>
            </span>
          ) : (
            <>
              {progress.enteredCount}/{activePlayersCount} entered · {progress.incompleteCount}{" "}
              incomplete
            </>
          )}
          {submission?.submittedAt ? (
            <span className="text-zinc-500">
              {" "}
              · Submitted {submission.submittedAt.toLocaleString()}
            </span>
          ) : null}
        </p>

        {!submission || !progress.hasAnySavedRows ? (
          <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            No scores saved yet for this rater.
          </p>
        ) : (
          <div className="overflow-x-auto rounded border border-zinc-200">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-zinc-100 text-zinc-900">
                <tr className="border-b border-zinc-200">
                  <th className="px-3 py-2 text-left">Player</th>
                  {METRIC_FIELDS.map((field) => (
                    <th key={field} className="px-3 py-2 text-center capitalize">
                      {field}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center">Unknown</th>
                </tr>
              </thead>
              <tbody>
                {activePlayers.map((player) => {
                  const rating = ratingByPlayerId.get(player.id);
                  return (
                    <tr key={player.id} className="border-b border-zinc-100 last:border-b-0">
                      <td className="px-3 py-2">
                        {player.firstName} {player.lastName}
                      </td>
                      {METRIC_FIELDS.map((field) => (
                        <td key={field} className="px-3 py-2 text-center text-zinc-700">
                          {rating?.[field] ?? "—"}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center text-zinc-700">
                        {rating?.unknownPlayer ? "Yes" : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-zinc-500">Export filename: {exportFilename}</p>
      </section>
    </main>
  );
}
