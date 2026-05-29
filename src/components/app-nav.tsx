"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  canSeeBackend: boolean;
  displayName: string;
};

export function AppNav({ canSeeBackend, displayName }: Props) {
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

  const baseClass = "rounded px-3 py-1 text-sm";

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between">
          <div className="hidden flex-wrap items-center gap-2 sm:flex sm:gap-3">
            <Link
              className={`${baseClass} ${pathname === "/rate" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}
              href="/rate"
            >
              Rate Players
            </Link>
            {canSeeBackend && (
              <Link
                className={`${baseClass} ${pathname?.startsWith("/backend") ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}
                href="/backend"
              >
                Backend
              </Link>
            )}
          </div>
          <div className="hidden flex-wrap items-center gap-2 sm:flex sm:gap-3">
            <span className="max-w-[10rem] truncate text-sm text-zinc-600 sm:max-w-none">
              {displayName}
            </span>
            <button className="rounded bg-zinc-800 px-3 py-1 text-sm text-white" onClick={logout}>
              Log out
            </button>
          </div>

          <span className="truncate text-sm text-zinc-600 sm:hidden">{displayName}</span>
          <button
            type="button"
            className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-700 sm:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3 sm:hidden">
            <div className="flex flex-col gap-2">
              <Link
                className={`${baseClass} text-center ${pathname === "/rate" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}
                href="/rate"
              >
                Rate Players
              </Link>
              {canSeeBackend && (
                <Link
                  className={`${baseClass} text-center ${pathname?.startsWith("/backend") ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}
                  href="/backend"
                >
                  Backend
                </Link>
              )}
            </div>
            <button
              className="w-full rounded bg-zinc-800 px-3 py-2 text-sm text-white"
              onClick={logout}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
