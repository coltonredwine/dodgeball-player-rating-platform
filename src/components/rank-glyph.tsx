import { useId } from "react";
import { formatRank, formatRankLabel } from "@/lib/rankings/rank-labels";

type Props = {
  rank: number;
  size?: number;
  className?: string;
  /** "light" = dark badge on light UI; "dark" = light badge on dark UI */
  surface?: "light" | "dark";
};

/** Per-rank horizontal nudge (SVG units) so cutout digits look centered in the circle. */
const OPTICAL_DX: Record<number, number> = {
  1: -0.7,
  2: -0.45,
  3: -0.4,
  4: -0.4,
  5: -0.45,
};

export function RankGlyph({ rank, size = 18, className = "", surface = "light" }: Props) {
  const digit = formatRank(rank);
  const maskId = useId();
  const label = formatRankLabel(rank);
  const fill = surface === "dark" ? "var(--draft-rank-glyph, #c5d4e4)" : "#27272a";
  const opticalDx = OPTICAL_DX[rank] ?? -0.4;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`inline-block shrink-0 align-middle ${className}`}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <defs>
        <mask id={maskId}>
          <rect width="24" height="24" fill="white" />
          <text
            x="12"
            y="12"
            dx={opticalDx}
            textAnchor="middle"
            dominantBaseline="central"
            fill="black"
            fontSize="16.75"
            fontWeight="800"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            textRendering="geometricPrecision"
          >
            {digit}
          </text>
        </mask>
      </defs>
      <circle cx="12" cy="12" r="9.25" fill={fill} mask={`url(#${maskId})`} />
    </svg>
  );
}
