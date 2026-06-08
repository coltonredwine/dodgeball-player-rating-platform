const INSTAGRAM_WEB_APP_ID = "936619743392459";

const RESERVED_PATH_SEGMENTS = new Set([
  "p",
  "reel",
  "reels",
  "stories",
  "explore",
  "accounts",
  "direct",
  "tv",
]);

export function isInstagramProfileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    return host === "instagram.com";
  } catch {
    return false;
  }
}

export function extractInstagramUsername(profileUrl: string): string | null {
  if (!isInstagramProfileUrl(profileUrl)) return null;

  try {
    const parsed = new URL(profileUrl);
    const [segment] = parsed.pathname.split("/").filter(Boolean);
    if (!segment || RESERVED_PATH_SEGMENTS.has(segment.toLowerCase())) return null;
    return segment;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function extractInstagramProfileImage(html: string): string | null {
  const profilePhotoMatch = html.match(
    /<img[^>]*alt="Profile photo"[^>]*class="_aadp"[^>]*src="([^"]+)"/i,
  );
  if (profilePhotoMatch?.[1]) return decodeHtmlEntities(profilePhotoMatch[1]);

  const profilePhotoAltOrder = html.match(
    /<img[^>]*class="_aadp"[^>]*alt="Profile photo"[^>]*src="([^"]+)"/i,
  );
  if (profilePhotoAltOrder?.[1]) return decodeHtmlEntities(profilePhotoAltOrder[1]);

  const aadpMatch = html.match(/<img[^>]*class="_aadp"[^>]*src="([^"]+)"/i);
  if (aadpMatch?.[1]) return decodeHtmlEntities(aadpMatch[1]);

  const aadpAltMatch = html.match(/<img[^>]*src="([^"]+)"[^>]*class="_aadp"/i);
  if (aadpAltMatch?.[1]) return decodeHtmlEntities(aadpAltMatch[1]);

  const ogMatch = html.match(/property="og:image" content="([^"]+)"/i);
  if (ogMatch?.[1]) return decodeHtmlEntities(ogMatch[1]);

  return null;
}

type InstagramWebProfileResponse = {
  data?: {
    user?: {
      profile_pic_url_hd?: string;
      profile_pic_url?: string;
    };
  };
};

async function fetchInstagramProfileImageFromApi(username: string): Promise<string | null> {
  const response = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "X-IG-App-ID": INSTAGRAM_WEB_APP_ID,
        "X-Requested-With": "XMLHttpRequest",
        Referer: `https://www.instagram.com/${username}/`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) return null;

  const payload = (await response.json()) as InstagramWebProfileResponse;
  const user = payload.data?.user;
  return user?.profile_pic_url_hd ?? user?.profile_pic_url ?? null;
}

async function fetchInstagramProfileImageFromHtml(profileUrl: string): Promise<string | null> {
  const response = await fetch(profileUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;
  const html = await response.text();
  return extractInstagramProfileImage(html);
}

export async function fetchInstagramProfileImage(profileUrl: string): Promise<string | null> {
  if (!isInstagramProfileUrl(profileUrl)) return null;

  const username = extractInstagramUsername(profileUrl);
  if (username) {
    const fromApi = await fetchInstagramProfileImageFromApi(username);
    if (fromApi) return fromApi;
  }

  return fetchInstagramProfileImageFromHtml(profileUrl);
}

export async function fetchInstagramProfileImageBytes(imageUrl: string): Promise<Response | null> {
  const response = await fetch(imageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: "https://www.instagram.com/",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;
  return response;
}
