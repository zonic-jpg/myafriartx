// Append a version token to remote URLs so updated artwork images
// bypass browser/CDN cache immediately. Local/bundled assets (already
// hashed by Vite) and data: URLs are returned unchanged.
export function bustImageUrl(
  url: string | null | undefined,
  version?: string | number | null,
): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  // Vite-bundled assets contain a hash already (e.g. /assets/foo-abc123.jpg)
  if (/\/assets\/.+-[A-Za-z0-9_]{6,}\./.test(url)) return url;

  const token =
    version != null && String(version).length > 0 ? encodeURIComponent(String(version)) : "";
  if (!token) return url;

  const sep = url.includes("?") ? "&" : "?";
  // Avoid stacking duplicate v= tokens
  if (new RegExp(`[?&]v=${token}(&|$)`).test(url)) return url;
  return `${url}${sep}v=${token}`;
}
