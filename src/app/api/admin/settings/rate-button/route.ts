import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/api-auth";
import { parseOptionalLink } from "@/lib/csv";
import { backendRedirect } from "@/lib/request-url";
import {
  RATE_PAGE_BUTTON_TITLE_KEY,
  RATE_PAGE_BUTTON_URL_KEY,
  setStringSetting,
} from "@/lib/settings";

export async function POST(request: Request) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const formData = await request.formData();
  const title = String(formData.get("buttonTitle") ?? "").trim();
  const urlRaw = String(formData.get("buttonUrl") ?? "").trim();

  if (title && !urlRaw) {
    return NextResponse.json({ error: "Button URL is required when a title is set" }, { status: 400 });
  }

  if (urlRaw) {
    const url = parseOptionalLink(urlRaw);
    if (!url) {
      return NextResponse.json({ error: "Invalid button URL" }, { status: 400 });
    }
    await setStringSetting(RATE_PAGE_BUTTON_TITLE_KEY, title || "Open link");
    await setStringSetting(RATE_PAGE_BUTTON_URL_KEY, url);
  } else {
    await setStringSetting(RATE_PAGE_BUTTON_TITLE_KEY, "");
    await setStringSetting(RATE_PAGE_BUTTON_URL_KEY, "");
  }

  return backendRedirect(request);
}
