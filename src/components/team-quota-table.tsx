import { RankGlyph } from "@/components/rank-glyph";
import { RANKS_DESC } from "@/lib/rankings/rank-labels";

type Props = {
  quotaNeed: Record<number, number>;
  quotaCap: Record<number, number>;
  showNeed?: boolean;
  showCap?: boolean;
  maxQuotasEnabled?: boolean;
  rankGlyphSize?: number;
  rankGlyphSurface?: "light" | "dark";
  className?: string;
  labelClassName?: string;
  headerClassName?: string;
  cellClassName?: string;
  borderClassName?: string;
};

function isRankColumnAtMax(
  rank: number,
  quotaCap: Record<number, number>,
  maxQuotasEnabled: boolean,
) {
  return maxQuotasEnabled && (quotaCap[rank] ?? 0) === 0;
}

export function TeamQuotaTable({
  quotaNeed,
  quotaCap,
  showNeed = true,
  showCap = true,
  maxQuotasEnabled = false,
  rankGlyphSize = 16,
  rankGlyphSurface = "dark",
  className = "text-xs",
  labelClassName = "text-[var(--draft-text-medium)]",
  headerClassName = "",
  cellClassName = "tabular-nums",
  borderClassName = "border-[var(--draft-divider)]",
}: Props) {
  return (
    <table className={`w-full border-collapse ${className}`}>
      <thead>
        <tr className={borderClassName}>
          <th className={`border-b px-1 py-1 text-left font-medium ${labelClassName} ${borderClassName}`} />
          {RANKS_DESC.map((rank) => {
            const atMax = isRankColumnAtMax(rank, quotaCap, maxQuotasEnabled);
            return (
              <th
                key={rank}
                className={[
                  "border-b px-1 py-1 text-center font-medium",
                  headerClassName,
                  borderClassName,
                  atMax ? "quota-column-inactive" : "",
                ].join(" ")}
              >
                <span className="inline-flex justify-center">
                  <RankGlyph
                    rank={rank}
                    size={rankGlyphSize}
                    surface={rankGlyphSurface}
                    className={atMax ? "quota-rank-glyph-inactive" : ""}
                  />
                </span>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {showNeed ? (
          <tr>
            <th
              scope="row"
              className={`border-b px-1 py-1 text-left font-medium ${labelClassName} ${showCap ? borderClassName : ""}`}
            >
              Need
            </th>
            {RANKS_DESC.map((rank) => {
              const need = quotaNeed[rank] ?? 0;
              const atMax = isRankColumnAtMax(rank, quotaCap, maxQuotasEnabled);
              return (
                <td
                  key={rank}
                  className={[
                    "border-b px-1 py-1 text-center",
                    cellClassName,
                    showCap ? borderClassName : "",
                    atMax ? "quota-column-inactive" : "",
                    !atMax && need > 0 ? "quota-need-positive" : "",
                  ].join(" ")}
                >
                  {need}
                </td>
              );
            })}
          </tr>
        ) : null}
        {showCap ? (
          <tr>
            <th scope="row" className={`px-1 py-1 text-left font-medium ${labelClassName}`}>
              Cap
            </th>
            {RANKS_DESC.map((rank) => {
              const atMax = isRankColumnAtMax(rank, quotaCap, maxQuotasEnabled);
              return (
                <td
                  key={rank}
                  className={[
                    "px-1 py-1 text-center",
                    cellClassName,
                    atMax ? "quota-column-inactive" : "",
                  ].join(" ")}
                >
                  {quotaCap[rank] ?? 0}
                </td>
              );
            })}
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
