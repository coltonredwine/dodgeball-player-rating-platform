import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { BackendSettingsForm } from "@/components/backend-settings-form";
import { CsvImportPanel } from "@/components/csv-import-panel";
import { PlayersEditor } from "@/components/players-editor";
import { RatersEditor } from "@/components/raters-editor";
import { resolveSession } from "@/lib/auth";
import { formatProgressLabel, getRaterProgress } from "@/lib/completion";
import { prisma } from "@/lib/db";
import { isAdminLike, isBackendUser, isSuperadmin } from "@/lib/rbac";
import {
  RATE_PAGE_BUTTON_TITLE_KEY,
  RATE_PAGE_BUTTON_URL_KEY,
  RATE_PAGE_TITLE_KEY,
  getBooleanSetting,
  getStringSetting,
} from "@/lib/settings";

export default async function BackendPage({
  searchParams,
}: {
  searchParams: Promise<{ importError?: string; importWarnings?: string }>;
}) {
  const session = await resolveSession();
  if (!session) redirect("/login");
  if (!isBackendUser(session)) redirect("/rate");

  const query = await searchParams;
  const importError = query.importError;
  const importWarnings = query.importWarnings;

  const [players, raters, submissions, scoringOpen, ratePageTitle, rateButtonTitle, rateButtonUrl] =
    await Promise.all([
      prisma.player.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
      prisma.rater.findMany({ orderBy: { name: "asc" } }),
      prisma.ratingSubmission.findMany({
        include: { rater: true, ratings: true },
        orderBy: { updatedAt: "desc" },
      }),
      getBooleanSetting("scoring_open", true),
      getStringSetting(RATE_PAGE_TITLE_KEY, ""),
      getStringSetting(RATE_PAGE_BUTTON_TITLE_KEY, ""),
      getStringSetting(RATE_PAGE_BUTTON_URL_KEY, ""),
    ]);

  const superadmin = isSuperadmin(session);
  const adminLike = isAdminLike(session);
  const activePlayersCount = players.filter((player) => player.active).length;
  const latestSubmissionByRater = new Map<string, (typeof submissions)[number]>();
  for (const submission of submissions) {
    if (!latestSubmissionByRater.has(submission.raterId)) {
      latestSubmissionByRater.set(submission.raterId, submission);
    }
  }

  return (
    <main className="bg-white text-zinc-900">
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
            <BackendSettingsForm
              className="space-y-2 rounded border border-zinc-200 p-4"
              action="/api/admin/settings/scoring"
            >
              <h2 className="font-semibold">Scoring window</h2>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="scoringOpen" value="true" defaultChecked={scoringOpen} />
                Open for submissions
              </label>
              <button className="block rounded bg-zinc-900 px-3 py-1 text-sm text-white" type="submit">
                Save scoring setting
              </button>
            </BackendSettingsForm>

            <BackendSettingsForm
              className="space-y-2 rounded border border-zinc-200 p-4"
              action="/api/admin/settings/rate-button"
            >
              <h2 className="font-semibold">Rate page</h2>
              <p className="text-xs text-zinc-600">
                Customize the page title and optional link button shown at the top of the rating
                page.
              </p>
              <label className="block text-sm">
                Page title
                <input
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
                  type="text"
                  name="pageTitle"
                  defaultValue={ratePageTitle}
                  placeholder="Rate Players"
                />
              </label>
              <label className="block text-sm">
                Button title
                <input
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
                  type="text"
                  name="buttonTitle"
                  defaultValue={rateButtonTitle}
                  placeholder="e.g. View rules"
                />
              </label>
              <label className="block text-sm">
                Button URL
                <input
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
                  type="url"
                  name="buttonUrl"
                  defaultValue={rateButtonUrl}
                  placeholder="https://..."
                />
              </label>
              <button className="block rounded bg-zinc-900 px-3 py-1 text-sm text-white" type="submit">
                Save rate page settings
              </button>
            </BackendSettingsForm>
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold">Completion view</h2>
          <div className="mt-2 overflow-x-auto rounded border border-zinc-200">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-zinc-50 text-left text-zinc-700">
                <tr className="border-b border-zinc-200">
                  <th className="px-2 py-1.5 font-medium">Rater</th>
                  <th className="px-2 py-1.5 font-medium">Email</th>
                  <th className="px-2 py-1.5 font-medium">Status</th>
                  <th className="px-2 py-1.5 font-medium">Preview</th>
                  <th className="px-2 py-1.5 font-medium">Export</th>
                </tr>
              </thead>
              <tbody>
                {raters.map((rater) => {
                  const latest = latestSubmissionByRater.get(rater.id);
                  const progress = getRaterProgress(
                    latest?.ratings ?? [],
                    activePlayersCount,
                    latest?.submittedAt,
                    latest?.status,
                  );
                  const statusLabel = formatProgressLabel(progress, activePlayersCount);

                  return (
                    <tr key={rater.id} className="border-b border-zinc-100 last:border-b-0">
                      <td className="px-2 py-1.5 whitespace-nowrap">{rater.name}</td>
                      <td className="px-2 py-1.5 text-zinc-600">{rater.email}</td>
                      <td className="px-2 py-1.5">
                        {progress.isSubmittedComplete ? (
                          <span className="inline-flex items-center gap-1 font-medium capitalize">
                            Complete <span aria-hidden="true">✅</span>
                          </span>
                        ) : (
                          <span className="text-zinc-700">{statusLabel}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {progress.hasAnySavedRows ? (
                          <Link
                            className="text-[11px] font-medium text-blue-700 underline hover:text-blue-900"
                            href={`/backend/rater/${rater.id}`}
                          >
                            View scores
                          </Link>
                        ) : (
                          <span className="text-[11px] text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {progress.hasAnySavedRows ? (
                          <a
                            className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium text-white ${
                              progress.isFullyComplete
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-zinc-500 hover:bg-zinc-600"
                            }`}
                            href={`/api/admin/export/rater/${rater.id}`}
                          >
                            Download CSV
                          </a>
                        ) : (
                          <span className="inline-block rounded bg-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                            Download CSV
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold">Players</h2>
            {adminLike ? (
              <div className="mt-2 space-y-4">
                <PlayersEditor
                  players={players.map((player) => ({
                    id: player.id,
                    firstName: player.firstName,
                    lastName: player.lastName,
                    link: player.link,
                    active: player.active,
                  }))}
                  permissions={{
                    canEditNames: superadmin,
                    canDelete: superadmin,
                  }}
                />
                {superadmin ? (
                  <CsvImportPanel
                    title="Import players CSV"
                    importAction="/api/admin/import/players"
                    entity="players"
                  />
                ) : null}
              </div>
            ) : (
              <table className="mt-2 min-w-full border-collapse rounded border border-zinc-200 text-sm">
                <thead className="bg-zinc-100">
                  <tr>
                    <th className="px-3 py-2 text-left">First</th>
                    <th className="px-3 py-2 text-left">Last</th>
                    <th className="px-3 py-2 text-left">Link</th>
                    <th className="px-3 py-2 text-left">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player) => (
                    <tr key={player.id} className="border-t border-zinc-200">
                      <td className="px-3 py-2">{player.firstName}</td>
                      <td className="px-3 py-2">{player.lastName}</td>
                      <td className="px-3 py-2 text-zinc-600">{player.link ?? "—"}</td>
                      <td className="px-3 py-2">{player.active ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold">Raters</h2>
            <div className="mt-2 space-y-4">
              <RatersEditor
                raters={raters.map((rater) => ({
                  id: rater.id,
                  name: rater.name,
                  email: rater.email,
                  role: rater.role,
                  passcodeDisplay: rater.passcodeDisplay,
                  active: rater.active,
                }))}
                permissions={{
                  viewerRole: session.role,
                  canEdit: adminLike,
                  canEditName: superadmin,
                  canEditRole: superadmin,
                  canEditActive: superadmin,
                  canDelete: superadmin,
                  canAdd: superadmin,
                }}
              />
              {superadmin ? (
                <CsvImportPanel
                  title="Import raters CSV"
                  importAction="/api/admin/import/raters"
                  entity="raters"
                />
              ) : null}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
