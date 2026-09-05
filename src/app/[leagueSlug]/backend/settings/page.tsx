import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { BackendSettingsForm } from "@/components/backend-settings-form";
import { ScoringWindowForm } from "@/components/scoring-window-form";
import { requireLeaguePageSession, leaguePath } from "@/lib/league-routes";
import { getAppNavData } from "@/lib/nav";
import { isSuperadmin } from "@/lib/rbac";
import {
  SCORING_OPEN_KEY,
  formatCloseAtDisplay,
  getScoringCloseAt,
  isScoringOpen,
} from "@/lib/scoring-window";
import {
  RATE_PAGE_BUTTON_TITLE_KEY,
  RATE_PAGE_BUTTON_URL_KEY,
  RATE_PAGE_TITLE_KEY,
  getBooleanSetting,
  getStringSetting,
} from "@/lib/settings";

export default async function BackendSettingsPage({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}) {
  const { leagueSlug } = await params;
  const { session, league } = await requireLeaguePageSession(leagueSlug);
  if (!isSuperadmin(session)) redirect(leaguePath(league.slug, "/rate"));

  const leagueId = session.leagueId;
  const [manualOpen, closeAtIso, effectiveOpen, ratePageTitle, rateButtonTitle, rateButtonUrl] =
    await Promise.all([
      getBooleanSetting(leagueId, SCORING_OPEN_KEY, true),
      getScoringCloseAt(leagueId),
      isScoringOpen(leagueId),
      getStringSetting(leagueId, RATE_PAGE_TITLE_KEY, ""),
      getStringSetting(leagueId, RATE_PAGE_BUTTON_TITLE_KEY, ""),
      getStringSetting(leagueId, RATE_PAGE_BUTTON_URL_KEY, ""),
    ]);
  const closeAtDisplay = formatCloseAtDisplay(closeAtIso);
  const nav = await getAppNavData(session);

  return (
    <main className="min-w-0 overflow-x-hidden bg-white text-zinc-900">
      <AppNav {...nav} />
      <section className="mx-auto min-w-0 max-w-7xl space-y-8 px-3 py-6 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <Link
            className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50"
            href={leaguePath(league.slug, "/backend/leagues")}
          >
            Manage leagues
          </Link>
        </div>

        <div className="grid min-w-0 gap-6 md:grid-cols-2">
          <ScoringWindowForm
            manualOpen={manualOpen}
            closeAtIso={closeAtIso}
            effectiveOpen={effectiveOpen}
            closeAtDisplay={closeAtDisplay}
          />

          <BackendSettingsForm
            className="min-w-0 space-y-3 rounded border border-zinc-200 p-4"
            action="/api/admin/settings/rate-button"
          >
            <h2 className="font-semibold">Rate page</h2>
            <p className="text-xs text-zinc-600">
              Customize the page title and optional link button shown at the top of the rating page.
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
            <button className="rounded bg-zinc-900 px-3 py-1 text-sm text-white" type="submit">
              Save rate page settings
            </button>
          </BackendSettingsForm>
        </div>
      </section>
    </main>
  );
}
