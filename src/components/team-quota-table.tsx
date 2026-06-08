import { RankGlyph } from "@/components/rank-glyph";
import { RANKS_DESC } from "@/lib/rankings/rank-labels";

type Props = {
  quotaNeed: Record<number, number>;
  quotaCap: Record<number, number>;
  rankGlyphSize?: number;
  rankGlyphSurface?: "light" | "dark";
  className?: string;
  labelClassName?: string;
  headerClassName?: string;
  cellClassName?: string;
  borderClassName?: string;
};

export function TeamQuotaTable({
  quotaNeed,
  quotaCap,
  rankGlyphSize = 16,
  rankGlyphSurface = "dark",
  className = "",
  labelClassName = "text-[var(--draft-text-medium)]",
  headerClassName = "",
  cellClassName = "tabular-nums",
  borderClassName = "border-[var(--draft-divider)]",
}: Props) {
  return (
    <table className={`w-full border-collapse text-xs ${className}`}>
      <thead>
        <tr className={borderClassName}>
          <th className={`border-b px-1 py-1 text-left font-medium ${labelClassName} ${borderClassName}`} />
          {RANKS_DESC.map((rank) => (
            <th
              key={rank}
              className={`border-b px-1 py-1 text-center font-medium ${headerClassName} ${borderClassName}`}
            >
              <span className="inline-flex justify-center">
                <RankGlyph rank={rank} size={rankGlyphSize} surface={rankGlyphSurface} />
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <th
            scope="row"
            className={`border-b px-1 py-1 text-left font-medium ${labelClassName} ${borderClassName}`}
          >
            Need
          </th>
          {RANKS_DESC.map((rank) => (
            <td
              key={rank}
              className={`border-b px-1 py-1 text-center ${cellClassName} ${borderClassName}`}
            >
              {quotaNeed[rank] ?? 0}
            </td>
          ))}
        </tr>
        <tr>
          <th scope="row" className={`px-1 py-1 text-left font-medium ${labelClassName}`}>
            Cap
          </th>
          {RANKS_DESC.map((rank) => (
            <td key={rank} className={`px-1 py-1 text-center ${cellClassName}`}>
              {quotaCap[rank] ?? 0}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
