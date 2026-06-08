import type { ReactNode } from "react";
import { RankGlyph } from "@/components/rank-glyph";
import type { PoolPlayerSection } from "@/lib/draft/pool-sections";
import { formatRankLabel } from "@/lib/rankings/rank-labels";

function sectionKey(section: PoolPlayerSection<unknown>): string {
  return section.kind === "saved" ? "saved" : `rank-${section.rank}`;
}

function PlayerPoolSectionHeader({
  section,
  rankGlyphSurface = "dark",
}: {
  section: PoolPlayerSection<unknown>;
  rankGlyphSurface?: "light" | "dark";
}) {
  if (section.kind === "saved") {
    return (
      <div className="draft-pool-section-header draft-pool-section-header--saved">
        <span className="text-sm font-semibold uppercase tracking-widest text-[var(--draft-bookmark-blue)]">
          Saved
        </span>
        <span className="ml-auto tabular-nums text-xs font-medium text-[var(--draft-text-medium)]">
          {section.players.length}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`draft-pool-section-header draft-pool-section-header--rank-${section.rank}`}
    >
      {section.rank > 0 ? (
        <RankGlyph rank={section.rank} size={24} surface={rankGlyphSurface} className="draft-tv-rank-glyph" />
      ) : null}
      <span className="text-sm font-semibold uppercase tracking-widest text-[var(--draft-text-high)]">
        {section.rank > 0 ? formatRankLabel(section.rank) : "Unranked"}
      </span>
      <span className="ml-auto tabular-nums text-xs font-medium text-[var(--draft-text-medium)]">
        {section.players.length}
      </span>
    </div>
  );
}

export function PlayerPoolRankSections<T>({
  sections,
  rankGlyphSurface = "dark",
  renderPlayer,
}: {
  sections: PoolPlayerSection<T>[];
  rankGlyphSurface?: "light" | "dark";
  renderPlayer: (player: T, section: PoolPlayerSection<T>) => ReactNode;
}) {
  if (sections.length === 0) return null;

  return (
    <>
      {sections.map((section) => (
        <section
          key={sectionKey(section)}
          className={`draft-pool-section draft-pool-section--${section.kind === "saved" ? "saved" : `rank-${section.rank}`}`}
        >
          <PlayerPoolSectionHeader section={section} rankGlyphSurface={rankGlyphSurface} />
          <div className="draft-pool-section-body">
            {section.players.map((player) => renderPlayer(player, section))}
          </div>
        </section>
      ))}
    </>
  );
}
