import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { DraftPageClient } from "@/components/draft-page-client";
import { resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAppNavData } from "@/lib/nav";
import { isAdminLike } from "@/lib/rbac";

export default async function DraftDashboardPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const session = await resolveSession();
  if (!session) redirect("/login");
  if (!isAdminLike(session)) redirect("/rate");

  const { draftId } = await params;
  const [draft, nav] = await Promise.all([
    prisma.draft.findUnique({ where: { id: draftId } }),
    getAppNavData(session),
  ]);
  if (!draft) redirect("/backend/drafts");

  return (
    <main className="min-w-0 overflow-x-hidden bg-white text-zinc-900">
      <AppNav {...nav} />
      <section className="mx-auto min-w-0 max-w-7xl space-y-4 px-3 py-6 sm:px-4">
        <Suspense fallback={null}>
          <DraftPageClient draftId={draftId} draftName={draft.name} />
        </Suspense>
      </section>
    </main>
  );
}
