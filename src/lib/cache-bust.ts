// Append a version token to remote URLs so updated artwork images
// bypass browser/CDN cache immediately. Local/bundled assets (already
// hashed by Vite) and data: URLs are returned unchanged.
export function bustImageUrl(
  url: string | null | undefined,
  version?: string | number | null,
): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  // Never cache-bust Vite-bundled or public static assets. Doing so creates a
  // unique URL per catalogue row (hundreds of requests to the same JPG) and
  // leaves many images incomplete. Hashes may include hyphens (e.g. Dzy-AhjY).
  if (
    url.startsWith("/assets/") ||
    url.startsWith("/media/") ||
    /(?:^|\/\/[^/]+)\/assets\//.test(url) ||
    /(?:^|\/\/[^/]+)\/media\//.test(url)
  ) {
    return url.split("?")[0] || url;
  }

  const token =
    version != null && String(version).length > 0 ? encodeURIComponent(String(version)) : "";
  if (!token) return url;

  const sep = url.includes("?") ? "&" : "?";
  // Avoid stacking duplicate v= tokens
  if (new RegExp(`[?&]v=${token}(&|$)`).test(url)) return url;
  return `${url}${sep}v=${token}`;
}

/** Reject empty, placeholder, or obviously broken CMS image URLs. */
export function isUsableImageUrl(url: string | null | undefined): url is string {
  const value = String(url ?? "").trim();
  if (!value) return false;
  if (/placeholder\.supabase\.co/i.test(value)) return false;
  if (/example\.com|via\.placeholder|placehold\.it|picsum\.photos\/0/i.test(value)) return false;
  if (value.startsWith("data:") || value.startsWith("blob:") || value.startsWith("/")) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
