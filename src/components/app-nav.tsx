"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TeamColorGrid } from "@/components/team-color-grid";
import {
  isAdminNavActive,
  isDraftNavActive,
  isNavLinkActive,
  type AppNavData,
  type LeagueOption,
} from "@/lib/nav";

type Props = AppNavData & {
  tone?: "light" | "draft-room";
  draftStatus?: {
    name: string;
    isLive: boolean;
    currentPickNumber: number;
    totalPicks: number;
  };
  /** When true, draftStatus renders only at lg breakpoint and above. */
  draftStatusDesktopOnly?: boolean;
  /** Span nav content edge-to-edge instead of max-w-7xl container. */
  fullWidth?: boolean;
  teamColor?: {
    value: string;
    takenColors: string[];
    disabled?: boolean;
    onChange: (color: string) => void;
  };
};

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function UserMenu({
  displayName,
  leagues,
  tone,
  teamColor,
  onLogout,
}: {
  displayName: string;
  leagues: LeagueOption[];
  tone: "light" | "draft-room";
  teamColor?: {
    value: string;
    takenColors: string[];
    disabled?: boolean;
    onChange: (color: string) => void;
  };
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isDraftRoom = tone === "draft-room";
  const switchableLeagues = leagues.filter((league) => league.href);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const triggerClass = isDraftRoom
    ? "text-[var(--draft-text-high)] hover:bg-[var(--draft-hover)]"
    : "text-zinc-900 hover:bg-zinc-50";
  const menuClass = isDraftRoom
    ? "border-[var(--draft-divider)] bg-[var(--draft-surface-3)] text-[var(--draft-text-high)] shadow-lg shadow-black/30"
    : "border-zinc-200 bg-white text-zinc-900 shadow-lg";
  const menuMuted = isDraftRoom ? "text-[var(--draft-text-medium)]" : "text-zinc-500";
  const menuItemHover = isDraftRoom
    ? "hover:bg-[var(--draft-hover)]"
    : "hover:bg-zinc-50";
  const avatarClass = isDraftRoom
    ? "bg-[var(--draft-surface-4)] ring-[var(--draft-divider)]"
    : "bg-zinc-200 ring-zinc-300";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors ${triggerClass}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className={`inline-flex h-8 w-8 shrink-0 rounded-full ring-1 ${avatarClass}`}
          style={teamColor ? { backgroundColor: teamColor.value } : undefined}
          aria-hidden="true"
        />
        <span className="hidden max-w-[9rem] truncate text-sm font-medium sm:inline">{displayName}</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 opacity-70 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border ${menuClass}`}
        >
          <div className={`border-b px-3 py-2.5 ${isDraftRoom ? "border-[var(--draft-divider)]" : "border-zinc-100"}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${menuMuted}`}>League</p>
            {switchableLeagues.length > 0 ? (
              <ul className="mt-1 space-y-0.5">
                {switchableLeagues.map((league) => (
                  <li key={league.href}>
                    <Link
                      role="menuitem"
                      href={league.href!}
                      className={`block rounded px-2 py-1.5 text-sm font-medium ${menuItemHover}`}
                      onClick={() => setOpen(false)}
                    >
                      {league.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 px-2 text-sm font-medium">{leagues[0]?.label ?? "Current league"}</p>
            )}
          </div>
          {teamColor ? (
            <div
              className={`border-b px-3 py-2.5 ${isDraftRoom ? "border-[var(--draft-divider)]" : "border-zinc-100"}`}
            >
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${menuMuted}`}>
                Team color
              </p>
              <div className="mt-2">
                <TeamColorGrid
                  value={teamColor.value}
                  takenColors={teamColor.takenColors}
                  disabled={teamColor.disabled}
                  surface={isDraftRoom ? "dark" : "light"}
                  onChange={teamColor.onChange}
                />
              </div>
            </div>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className={`block w-full px-3 py-2.5 text-left text-sm ${menuItemHover}`}
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AppNav({
  primaryLinks,
  showAdmin,
  adminHref,
  displayName,
  leagues,
  tone = "light",
  draftStatus,
  draftStatusDesktopOnly = false,
  fullWidth = false,
  teamColor,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDraftRoom = tone === "draft-room";

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMobileMenuOpen(false);
    router.push("/login");
    router.refresh();
  }

  function primaryLinkClass(href: string, compact = false) {
    const isRate = href === "/rate";
    const active = isRate
      ? isNavLinkActive(pathname ?? "", href)
      : isDraftNavActive(pathname ?? "", href);

    if (isDraftRoom) {
      return [
        compact ? "block rounded px-3 py-2 text-sm" : "px-1 py-2 text-sm font-medium",
        active
          ? compact
            ? "bg-[var(--draft-hover)] font-semibold text-[var(--draft-text-high)]"
            : "font-semibold text-[var(--draft-text-high)]"
          : compact
            ? "text-[var(--draft-text-medium)] hover:bg-[var(--draft-hover)] hover:text-[var(--draft-text-high)]"
            : "text-[var(--draft-text-medium)] hover:text-[var(--draft-text-high)]",
      ].join(" ");
    }

    return [
      compact ? "block rounded px-3 py-2 text-sm" : "px-1 py-2 text-sm font-medium",
      active
        ? compact
          ? "bg-zinc-100 font-semibold text-zinc-900"
          : "font-semibold text-zinc-900"
        : compact
          ? "text-zinc-700 hover:bg-zinc-50"
          : "text-zinc-600 hover:text-zinc-900",
    ].join(" ");
  }

  function adminLinkClass(compact = false) {
    const active = isAdminNavActive(pathname ?? "");
    if (isDraftRoom) {
      return [
        compact ? "block rounded px-3 py-2 text-sm" : "px-1 py-2 text-sm font-medium",
        active
          ? compact
            ? "bg-[var(--draft-hover)] font-semibold text-[var(--draft-text-high)]"
            : "font-semibold text-[var(--draft-text-high)]"
          : compact
            ? "text-[var(--draft-text-medium)] hover:bg-[var(--draft-hover)]"
            : "text-[var(--draft-text-medium)] hover:text-[var(--draft-text-high)]",
      ].join(" ");
    }
    return [
      compact ? "block rounded px-3 py-2 text-sm" : "px-1 py-2 text-sm font-medium",
      active
        ? compact
          ? "bg-zinc-100 font-semibold text-zinc-900"
          : "font-semibold text-zinc-900"
        : compact
          ? "text-zinc-700 hover:bg-zinc-50"
          : "text-zinc-600 hover:text-zinc-900",
    ].join(" ");
  }

  const headerClass = isDraftRoom
    ? "sticky top-0 z-30 border-b border-[var(--draft-divider)] bg-[var(--draft-surface-2)] text-[var(--draft-text-high)]"
    : "sticky top-0 z-30 border-b border-zinc-200 bg-white text-zinc-900";

  const draftStatusClass = draftStatusDesktopOnly ? "hidden lg:flex" : "flex";
  const containerClass = fullWidth
    ? "flex h-14 w-full items-center gap-4 px-3 sm:px-4"
    : "mx-auto flex h-14 max-w-7xl items-center gap-4 px-3 sm:px-4";

  return (
    <header className={headerClass}>
      <div className={containerClass}>
        <div className="flex min-w-0 shrink-0 items-center gap-3 sm:gap-6">
          <button
            type="button"
            className={`rounded border px-2 py-1 text-sm sm:hidden ${
              isDraftRoom
                ? "border-[var(--draft-divider)] text-[var(--draft-text-medium)]"
                : "border-zinc-300 text-zinc-700"
            }`}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>

          <nav className="hidden min-w-0 items-center gap-4 sm:flex sm:gap-6" aria-label="Main">
            {primaryLinks.map((link) => (
              <Link key={link.href} className={primaryLinkClass(link.href)} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {draftStatus ? (
          <div
            className={`${draftStatusClass} min-w-0 flex-1 flex-wrap items-center justify-center gap-2 sm:gap-3`}
          >
            <h2 className="truncate text-base font-semibold sm:text-lg">{draftStatus.name}</h2>
            {!draftStatus.isLive ? (
              <span className="shrink-0 rounded bg-amber-950/80 px-2 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-amber-800/80">
                Not live
              </span>
            ) : (
              <span className="shrink-0 rounded bg-green-950/80 px-2 py-0.5 text-xs font-medium text-green-300 ring-1 ring-green-800/80">
                Live
              </span>
            )}
            <span className="shrink-0 text-sm text-[var(--draft-text-medium)]">
              Pick {Math.min(draftStatus.currentPickNumber, draftStatus.totalPicks)} /{" "}
              {draftStatus.totalPicks}
            </span>
          </div>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-5">
          {showAdmin ? (
            <Link className={adminLinkClass()} href={adminHref}>
              Admin
            </Link>
          ) : null}
          <UserMenu
            displayName={displayName}
            leagues={leagues}
            tone={tone}
            teamColor={teamColor}
            onLogout={() => void logout()}
          />
        </div>
      </div>

      {mobileMenuOpen ? (
        <div
          className={`border-t pb-3 sm:hidden ${isDraftRoom ? "border-[var(--draft-divider)]" : "border-zinc-200"}`}
        >
          <nav aria-label="Main" className="px-2 pt-2">
            <ul className="space-y-0.5">
              {primaryLinks.map((link) => (
                <li key={link.href}>
                  <Link className={primaryLinkClass(link.href, true)} href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
              {showAdmin ? (
                <li>
                  <Link className={adminLinkClass(true)} href={adminHref}>
                    Admin
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
