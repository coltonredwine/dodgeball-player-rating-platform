"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  canSeeBackend: boolean;
  displayName: string;
};

export function AppNav({ canSeeBackend, displayName }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const baseClass = "rounded px-3 py-1 text-sm";

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
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
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-600">{displayName}</span>
          <button className="rounded bg-zinc-800 px-3 py-1 text-sm text-white" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
