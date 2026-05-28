import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { CsvImportPanel } from "@/components/csv-import-panel";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminLike, isSuperadmin } from "@/lib/rbac";
import { getBooleanSetting } from "@/lib/settings";

function isCompleteSavedRow(rating: {
  unknownPlayer: boolean;
  power: number | null;
  accuracy: number | null;
  intimidation: number | null;
  catching: number | null;
  evasion: number | null;
  nerve: number | null;
}) {
  if (rating.unknownPlayer) return true;
  const values = [
    rating.power,
    rating.accuracy,
    rating.intimidation,
    rating.catching,
    rating.evasion,
    rating.nerve,
  ];
  return values.every((value) => typeof value === "number" && value >= 1 && value <= 7);
}

export default async function BackendPage({
  searchParams,
}: {
  searchParams: Promise<{ importError?: string; importWarnings?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdminLike(session)) redirect("/rate");

  const query = await searchParams;
  const importError = query.importError;
  const importWarnings = query.importWarnings;

  const [players, raters, submissions] = await Promise.all([
    prisma.player.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    prisma.rater.findMany({ orderBy: { name: "asc" } }),
    prisma.ratingSubmission.findMany({
      include: { rater: true, ratings: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const scoringOpen = await getBooleanSetting("scoring_open", true);

  const superadmin = isSuperadmin(session);
  const activePlayersCount = players.filter((player) => player.active).length;
  const latestSubmissionByRater = new Map<string, (typeof submissions)[number]>();
  for (const submission of submissions) {
    if (!latestSubmissionByRater.has(submission.raterId)) {
      latestSubmissionByRater.set(submission.raterId, submission);
    }
  }

  return (
    <main>
      <AppNav canSeeBackend displayName={session.name || session.email} />
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Backend</h1>
          <div className="flex gap-2">
            <Link
              className="rounded border border-zinc-300 px-3 py-1 text-sm"
              href="/api/admin/export/all-raters"
            >
              Download all-raters CSV
            </Link>
          </div>
        </div>

        {importError ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Import failed: {importError}
          </p>
        ) : null}
        {importWarnings ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Import finished with {importWarnings} row warning(s). Check your CSV and re-import if
            needed.
          </p>
        ) : null}

        {superadmin && (
          <div className="grid gap-4 md:grid-cols-2">
            <CsvImportPanel
              title="Import players CSV"
              importAction="/api/admin/import/players"
              entity="players"
            />

            <CsvImportPanel
              title="Import raters CSV"
              importAction="/api/admin/import/raters"
              entity="raters"
            />

            <form className="space-y-2 rounded border border-zinc-200 p-4" action="/api/admin/settings/scoring" method="post">
              <h2 className="font-semibold">Scoring window</h2>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="scoringOpen" value="true" defaultChecked={scoringOpen} />
                Open for submissions
              </label>
              <button className="block rounded bg-zinc-900 px-3 py-1 text-sm text-white" type="submit">
                Save scoring setting
              </button>
            </form>
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold">Completion view</h2>
          <table className="mt-2 min-w-full border-collapse overflow-hidden rounded border border-zinc-200 text-sm">
            <thead className="bg-zinc-100">
              <tr>
                <th className="px-3 py-2 text-left">Rater</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Export</th>
              </tr>
            </thead>
            <tbody>
              {raters.map((rater) => {
                const latest = latestSubmissionByRater.get(rater.id);
                const completeSavedCount =
                  latest?.ratings.filter((rating) => isCompleteSavedRow(rating)).length ?? 0;
                const hasSavedRows = (latest?.ratings.length ?? 0) > 0;
                const isFullyComplete =
                  activePlayersCount > 0 && completeSavedCount === activePlayersCount;
                let status = "not started";
                if (latest?.status === "submitted" && isFullyComplete) {
                  status = "submitted";
                } else if (hasSavedRows) {
                  status = "incomplete";
                } else if (latest) {
                  status = "in progress";
                }
                return (
                  <tr key={rater.id} className="border-t border-zinc-200">
                    <td className="px-3 py-2">{rater.name}</td>
                    <td className="px-3 py-2">{rater.email}</td>
                    <td className="px-3 py-2 capitalize">{status}</td>
                    <td className="px-3 py-2">
                      <Link className="text-blue-700 underline" href={`/api/admin/export/rater/${rater.id}`}>
                        Download CSV
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold">Players table</h2>
            <table className="mt-2 min-w-full border-collapse rounded border border-zinc-200 text-sm">
              <thead className="bg-zinc-100">
                <tr>
                  <th className="px-3 py-2 text-left">First</th>
                  <th className="px-3 py-2 text-left">Last</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-t border-zinc-200">
                    <td className="px-3 py-2">{player.firstName}</td>
                    <td className="px-3 py-2">{player.lastName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Raters table</h2>
            <table className="mt-2 min-w-full border-collapse rounded border border-zinc-200 text-sm">
              <thead className="bg-zinc-100">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Admin</th>
                </tr>
              </thead>
              <tbody>
                {raters.map((rater) => (
                  <tr key={rater.id} className="border-t border-zinc-200">
                    <td className="px-3 py-2">{rater.name}</td>
                    <td className="px-3 py-2">{rater.email}</td>
                    <td className="px-3 py-2">{rater.isAdmin ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
