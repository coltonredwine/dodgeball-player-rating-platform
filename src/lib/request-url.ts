import { NextResponse } from "next/server";

export function getRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

export function backendRedirect(
  request: Request,
  params?: Record<string, string>,
  path = "/backend",
) {
  const url = new URL(path, getRequestOrigin(request));
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(url);
}
