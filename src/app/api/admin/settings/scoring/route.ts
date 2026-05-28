import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/api-auth";
import { setBooleanSetting } from "@/lib/settings";

export async function POST(request: Request) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const formData = await request.formData();
  const scoringOpen = formData.get("scoringOpen") === "true";
  await setBooleanSetting("scoring_open", scoringOpen);
  return NextResponse.redirect(new URL("/backend", request.url));
}
