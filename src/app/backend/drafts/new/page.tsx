import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { BuildDraftForm } from "@/components/build-draft-form";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAppNavData } from "@/lib/nav";
import { isAdminLike } from "@/lib/rbac";

export default async function NewDraftPage() {
  const session = await resolveSession();
  if (!session) redirect("/login");
  if (!isAdminLike(session)) redirect("/rate");

  const [players, raters, nav] = await Promise.all([
    prisma.player.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    prisma.rater.findMany({ orderBy: { name: "asc" } }),
    getAppNavData(session),
  ]);

  return (
    <main className="min-w-0 overflow-x-hidden bg-white text-zinc-900">
      <AppNav {...nav} />
      <section className="mx-auto min-w-0 max-w-3xl space-y-4 px-3 py-6 sm:px-4">
        <Link className="text-sm text-blue-700 underline" href="/backend/drafts">
          ← Back to drafts
        </Link>
        <h1 className="text-2xl font-semibold">Build draft</h1>
        <BuildDraftForm players={players} raters={raters} />
      </section>
    </main>
  );
}
