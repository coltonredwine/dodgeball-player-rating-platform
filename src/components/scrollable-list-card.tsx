import type { ReactNode } from "react";
import { PlayerSearchInput } from "@/components/player-search-input";

type Props = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  maxHeightClass?: string;
  headerAction?: ReactNode;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  searchPlaceholder?: string;
  titleClassName?: string;
  headerClassName?: string;
  descriptionClassName?: string;
  fillHeight?: boolean;
};

export function ScrollableListCard({
  title,
  description,
  children,
  className = "",
  maxHeightClass = "max-h-[60vh]",
  headerAction,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder,
  titleClassName = "",
  headerClassName = "",
  descriptionClassName = "",
  fillHeight = false,
}: Props) {
  const showHeader = title || headerAction || onSearchQueryChange;
  const surfaceClass = className || "border border-zinc-200 bg-white";
  const headerClass = headerClassName || "border-zinc-200";
  const descriptionClass = descriptionClassName || "text-zinc-500";
  const scrollClass = fillHeight
    ? "min-h-0 flex-1 overflow-y-auto overflow-x-auto"
    : `${maxHeightClass} overflow-y-auto overflow-x-auto`;

  return (
    <div className={`rounded ${surfaceClass} ${fillHeight ? "flex h-full min-h-0 flex-col" : ""}`}>
      {showHeader ? (
        <div className={`space-y-2 border-b px-3 py-2 ${headerClass}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              {title ? <h3 className={`font-medium ${titleClassName}`}>{title}</h3> : null}
              {description ? <p className={`mt-0.5 text-xs ${descriptionClass}`}>{description}</p> : null}
            </div>
            {headerAction}
          </div>
          {onSearchQueryChange ? (
            <PlayerSearchInput
              value={searchQuery ?? ""}
              onChange={onSearchQueryChange}
              placeholder={searchPlaceholder}
            />
          ) : null}
        </div>
      ) : null}
      <div className={scrollClass}>{children}</div>
    </div>
  );
}
