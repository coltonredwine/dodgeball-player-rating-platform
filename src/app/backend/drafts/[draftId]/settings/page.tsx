import { redirect } from "next/navigation";

export default async function DraftSettingsPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  redirect(`/backend/drafts/${draftId}?settings=1`);
}
