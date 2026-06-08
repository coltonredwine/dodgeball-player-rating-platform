import { formatRank, formatRankLabel } from "@/lib/rankings/rank-labels";

type Props = {
  rank: number;
  size?: number;
  className?: string;
  /** "light" = dark badge on light UI; "dark" = light badge on dark UI */
  surface?: "light" | "dark";
};

/** Per-rank horizontal nudge (SVG units) so digits look centered in the circle. */
const OPTICAL_DX: Record<number, number> = {
  1: -0.7,
  2: -0.45,
  3: -0.4,
  4: -0.4,
  5: -0.45,
};

export function RankGlyph({ rank, size = 18, className = "", surface = "light" }: Props) {
  const digit = formatRank(rank);
  const label = formatRankLabel(rank);
  const strokeColor =
    surface === "dark" ? "var(--draft-rank-glyph, #8faecb)" : "#2c4a6e";
  const digitColor =
    surface === "dark"
      ? "var(--draft-rank-glyph-digit, var(--draft-rank-glyph, #b8cce4))"
      : "#3a5f8f";
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
      <circle cx="12" cy="12" r="9.25" fill="none" stroke={strokeColor} strokeWidth="1.15" />
      <text
        x="12"
        y="12"
        dx={opticalDx}
        textAnchor="middle"
        dominantBaseline="central"
        fill={digitColor}
        fontSize="13.75"
        fontWeight="700"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        textRendering="geometricPrecision"
      >
        {digit}
      </text>
    </svg>
  );
}
