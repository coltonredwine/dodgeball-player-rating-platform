/** Shared wrapper class — pairs with src/styles/draft-room-dark.css */
export const DRAFT_ROOM_CLASS = "draft-room";

export type DraftRoomTheme = {
  page: string;
  root: string;
  statusBar: string;
  badgeLive: string;
  badgeNotLive: string;
  pickStatus: string;
  turnSection: string;
  turnLabel: string;
  scrollCard: string;
  scrollHeader: string;
  tableHead: string;
  tableRowBorder: string;
  hoverRow: string;
  selectedRow: string;
  empty: string;
  rankSummary: string;
  score: string;
  scoreEmphasis: string;
  scoreCalc: string;
  card: string;
  cardBorder: string;
  cardMeta: string;
  cardHeader: string;
  cardSection: string;
  cardSectionLabel: string;
  cardStatsBorder: string;
  cardStats: string;
  cardStatsMuted: string;
  rosterMuted: string;
  panelHeader: string;
  panelDivider: string;
  ringOffset: string;
  rankGlyphSurface: "light" | "dark";
};

export const DRAFT_ROOM_LIGHT: DraftRoomTheme = {
  page: "min-h-screen bg-white text-zinc-900",
  root: "text-zinc-900",
  statusBar: "border-zinc-200 bg-white shadow-sm",
  badgeLive: "bg-green-100 text-green-900",
  badgeNotLive: "bg-amber-100 text-amber-900",
  pickStatus: "text-zinc-700",
  turnSection: "border-zinc-200 bg-white",
  turnLabel: "text-zinc-500",
  scrollCard: "border border-zinc-200 bg-white",
  scrollHeader: "border-zinc-200",
  tableHead: "border-zinc-200 bg-white text-zinc-600",
  tableRowBorder: "border-zinc-100",
  hoverRow: "hover:bg-zinc-50",
  selectedRow: "bg-blue-50",
  empty: "text-zinc-500",
  rankSummary: "text-zinc-700",
  score: "text-zinc-600",
  scoreEmphasis: "text-zinc-800",
  scoreCalc: "text-zinc-900",
  card: "bg-white",
  cardBorder: "border-zinc-200",
  cardMeta: "text-zinc-500",
  cardHeader: "border-b border-zinc-200 pb-3",
  cardSection: "rounded border border-zinc-200 bg-zinc-50 p-2",
  cardSectionLabel: "mb-2 border-b border-zinc-200 pb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500",
  cardStatsBorder: "border-zinc-200",
  cardStats: "text-zinc-700",
  cardStatsMuted: "text-zinc-400",
  rosterMuted: "text-zinc-600",
  panelHeader: "border-zinc-200 bg-zinc-50",
  panelDivider: "border-zinc-200",
  ringOffset: "ring-offset-white",
  rankGlyphSurface: "light",
};

/** MD2 dark theme — blue-tinted surfaces via .draft-room CSS variables */
export const DRAFT_ROOM_DARK: DraftRoomTheme = {
  page: `${DRAFT_ROOM_CLASS} min-h-screen text-lg`,
  root: "text-[var(--draft-text-high)]",
  statusBar:
    "border border-[var(--draft-divider)] bg-[var(--draft-surface-3)] shadow-lg shadow-[var(--draft-shadow)]",
  badgeLive: "bg-green-950/80 text-green-300 ring-1 ring-green-800/80",
  badgeNotLive: "bg-amber-950/80 text-amber-300 ring-1 ring-amber-800/80",
  pickStatus: "text-[var(--draft-text-medium)]",
  turnSection: "border border-[var(--draft-divider)] bg-[var(--draft-surface-2)]",
  turnLabel: "text-[var(--draft-text-medium)]",
  scrollCard: "border border-[color:var(--draft-divider)] bg-[var(--draft-surface-2)]",
  scrollHeader: "border-[color:var(--draft-divider)]",
  tableHead:
    "border-[var(--draft-divider)] bg-[var(--draft-surface-2)] text-[var(--draft-text-medium)]",
  tableRowBorder: "border-[var(--draft-divider)]",
  hoverRow: "hover:bg-[var(--draft-hover)]",
  selectedRow: "bg-[var(--draft-selected)]",
  empty: "text-[var(--draft-text-disabled)]",
  rankSummary: "text-[var(--draft-text-medium)]",
  score: "text-[var(--draft-text-medium)]",
  scoreEmphasis: "text-[var(--draft-text-high)]",
  scoreCalc: "text-[var(--draft-text-high)]",
  card: "bg-[var(--draft-surface-2)]",
  cardBorder: "border-[color:var(--draft-divider)]",
  cardMeta: "text-[var(--draft-text-medium)]",
  cardHeader: "border-b border-[color:var(--draft-divider)] pb-3",
  cardSection: "rounded border border-[color:var(--draft-divider)] bg-[var(--draft-surface-1)] p-2",
  cardSectionLabel:
    "mb-2 border-b border-[color:var(--draft-divider)] pb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--draft-text-medium)]",
  cardStatsBorder: "border-[var(--draft-divider)]",
  cardStats: "text-[var(--draft-text-medium)]",
  cardStatsMuted: "text-[var(--draft-text-disabled)]",
  rosterMuted: "text-[var(--draft-text-medium)]",
  panelHeader:
    "border-[var(--draft-divider)] bg-[var(--draft-surface-3)] text-[var(--draft-text-medium)]",
  panelDivider: "border-[var(--draft-divider)]",
  ringOffset: "ring-offset-[var(--draft-bg)]",
  rankGlyphSurface: "dark",
};
