import { METRIC_FIELDS } from "@/lib/constants";
import { isCompleteSavedRow, type SavedRating } from "@/lib/completion";

export type RaterScoreRow = {
  playerId: string;
  firstName: string;
  lastName: string;
  link?: string | null;
  rating?: SavedRating | null;
};

const MOBILE_METRIC_TH_CLASS =
  "relative w-[1.65rem] max-w-[1.65rem] p-0 align-bottom sm:w-auto sm:max-w-none sm:p-2 sm:align-middle";

const MOBILE_METRIC_TD_CLASS =
  "w-[1.65rem] max-w-[1.65rem] px-0 py-1.5 text-center sm:w-auto sm:max-w-none sm:px-2 sm:py-2";

function MobileRotatedHeader({ label }: { label: string }) {
  return (
    <div className="flex w-full flex-col items-center justify-end overflow-hidden py-1 sm:hidden">
      <span className="text-[9px] capitalize leading-none text-zinc-900 [writing-mode:vertical-rl]">
        {label}
      </span>
    </div>
  );
}

export function RaterScoresTable({ rows }: { rows: RaterScoreRow[] }) {
  return (
    <table className="w-full table-fixed border-collapse text-sm sm:table-auto sm:min-w-full">
        <colgroup className="sm:hidden">
          <col className="w-[26%]" />
          {METRIC_FIELDS.map((field) => (
            <col key={field} className="w-[10%]" />
          ))}
          <col className="w-[14%]" />
        </colgroup>
        <thead className="sticky top-0 z-20 bg-zinc-100 text-zinc-900">
          <tr>
            <th className="sticky left-0 z-30 w-[26%] bg-zinc-100 px-1 py-2 text-left text-xs text-zinc-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] sm:w-auto sm:px-3 sm:text-sm">
              Player
            </th>
            {METRIC_FIELDS.map((field) => (
              <th key={field} className={`${MOBILE_METRIC_TH_CLASS} text-zinc-900`}>
                <MobileRotatedHeader label={field} />
                <span className="hidden capitalize sm:inline">{field}</span>
              </th>
            ))}
            <th className={`${MOBILE_METRIC_TH_CLASS} text-zinc-900`}>
              <MobileRotatedHeader label="Unknown" />
              <span className="hidden sm:inline">I don&apos;t know</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const saved = row.rating;
            const complete = saved ? isCompleteSavedRow(saved) : false;
            const rowBg = complete ? "bg-[#dfe8df]" : "bg-white";

            return (
              <tr
                key={row.playerId}
                className={`border-t border-zinc-200 ${rowBg} ${complete ? "text-zinc-600" : ""}`}
              >
                <td
                  className={`sticky left-0 z-10 w-[26%] px-1 py-1.5 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] sm:w-auto sm:px-3 sm:py-2 ${rowBg}`}
                >
                  <span
                    className="block truncate text-[11px] leading-tight sm:max-w-none sm:text-sm"
                    title={`${row.firstName} ${row.lastName}`}
                  >
                    {row.link ? (
                      <a
                        href={row.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-800 underline decoration-blue-800/40 underline-offset-2"
                      >
                        {row.firstName} {row.lastName}
                      </a>
                    ) : (
                      <>
                        {row.firstName} {row.lastName}
                      </>
                    )}
                  </span>
                </td>
                {METRIC_FIELDS.map((field) => (
                  <td key={field} className={`${MOBILE_METRIC_TD_CLASS} text-zinc-700`}>
                    <span className="inline-block w-full text-center text-xs sm:text-sm">
                      {saved?.unknownPlayer ? "—" : (saved?.[field] ?? "—")}
                    </span>
                  </td>
                ))}
                <td className={`${MOBILE_METRIC_TD_CLASS} text-zinc-700`}>
                  <span className="inline-block w-full text-center text-xs sm:text-sm">
                    {saved?.unknownPlayer ? "Yes" : "—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
  );
}
