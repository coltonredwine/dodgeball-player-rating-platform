"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isNavLinkActive, type NavLink } from "@/lib/nav";

type Props = {
  links: NavLink[];
  displayName: string;
};

export function AppNav({ links, displayName }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMobileMenuOpen(false);
    router.push("/login");
    router.refresh();
  }

  function linkClass(href: string, compact = false) {
    const active = isNavLinkActive(pathname ?? "", href);
    return [
      compact ? "block px-3 py-2 text-sm" : "px-3 py-3 text-sm font-medium",
      active
        ? compact
          ? "bg-zinc-100 font-medium text-zinc-900"
          : "border-b-2 border-zinc-900 text-zinc-900"
        : compact
          ? "text-zinc-700 hover:bg-zinc-50"
          : "border-b-2 border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-900",
    ].join(" ");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white text-zinc-900">
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="flex items-center justify-between gap-4">
          <nav className="hidden min-w-0 flex-1 sm:flex" aria-label="Main">
            <ul className="-mb-px flex flex-wrap items-stretch gap-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link className={linkClass(link.href)} href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden shrink-0 items-center gap-3 sm:flex">
            <span className="max-w-[12rem] truncate text-sm text-zinc-600">{displayName}</span>
            <button
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
              type="button"
              onClick={logout}
            >
              Log out
            </button>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:hidden">
            <span className="truncate text-sm font-medium text-zinc-900">
              {links.find((link) => isNavLinkActive(pathname ?? "", link.href))?.label ??
                "Menu"}
            </span>
            <button
              type="button"
              className="shrink-0 rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-700"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-zinc-200 pb-3 sm:hidden">
            <nav aria-label="Main">
              <ul className="mt-1 space-y-0.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link className={linkClass(link.href, true)} href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-3 border-t border-zinc-200 pt-3">
              <p className="truncate px-3 text-sm text-zinc-600">{displayName}</p>
              <button
                className="mt-2 w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-800"
                type="button"
                onClick={logout}
              >
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
