function parseHexColor(color: string): { r: number; g: number; b: number } | null {
  const hex = color.trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!match) return null;

  const raw = match[1];
  const normalized =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

/** Returns black or white text color for readable contrast on a solid background. */
export function getContrastTextColor(backgroundColor: string): "#000000" | "#ffffff" {
  const rgb = parseHexColor(backgroundColor);
  if (!rgb) return "#ffffff";

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.62 ? "#000000" : "#ffffff";
}
