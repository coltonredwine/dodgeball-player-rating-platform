import { requireSuperadmin } from "@/lib/api-auth";
import { backendRedirect } from "@/lib/request-url";
import { setBooleanSetting } from "@/lib/settings";

export async function POST(request: Request) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const formData = await request.formData();
  const scoringOpen = formData.get("scoringOpen") === "true";
  await setBooleanSetting("scoring_open", scoringOpen);
  return backendRedirect(request);
}
