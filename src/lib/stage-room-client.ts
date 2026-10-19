/**
 * Client-side ArtStage staging for static Netlify.
 * Prefers POST /api/stage-room (Netlify Function). Falls back to canvas hang preview
 * when the function is missing or AI is unconfigured.
 */
import { supabase } from "@/integrations/supabase/client";
import { LOCAL_MOCK_STYLES, mergeStyles, styleById, type StageStyle } from "@/lib/stage-styles";
import { LOCAL_MOCK_ARTWORKS, LOCAL_MOCK_ARTISTS } from "@/lib/mock-catalogue";
import { localImageForKey } from "@/lib/local-image-assets";

export type StagePayload = {
  sourceImageBase64: string;
  artworkIds: string[];
  styleId: string;
  mediaFilter?: string[];
  placementRequest?: string;
  artworks?: { id: string; title: string; medium?: string; image_url: string }[];
  stylePrompt?: string;
};

export async function fetchStudioCatalogClient() {
  try {
    const settings = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "mock_catalogue_enabled")
      .maybeSingle();
    const mockOn = typeof settings.data?.value === "boolean" ? settings.data.value : true;
    const source = mockOn ? "mock" : "live";

    const [stylesRes, artworksRes, artistsRes] = await Promise.all([
      supabase.from("styles").select("*").eq("is_active", true).order("sort_order"),
      (supabase.from("artworks") as any)
        .select("*")
        .eq("is_active", true)
        .eq("content_source", source),
      (supabase.from("artists") as any).select("id,name").eq("content_source", source),
    ]);

    let artworks = artworksRes.data ?? [];
    let artists = artistsRes.data ?? [];
    if (!artworks.length) {
      artworks = LOCAL_MOCK_ARTWORKS;
      artists = LOCAL_MOCK_ARTISTS;
    }

    const styles = mergeStyles(stylesRes.data as StageStyle[]);
    return { artworks, artists, styles, source: "client" as const };
  } catch {
    return {
      artworks: LOCAL_MOCK_ARTWORKS,
      artists: LOCAL_MOCK_ARTISTS,
      styles: LOCAL_MOCK_STYLES,
      source: "fallback-mock" as const,
    };
  }
}

/**
 * Pick the calmest (lowest-detail) rectangle of the room photo for the artwork so it
 * lands on bare wall instead of over bookshelves, existing pictures or furniture.
 * Works on a small greyscale copy: gradient energy + an integral image, searching the
 * upper-middle band of the picture where walls are, with a slight pull to the centre.
 */
function findEmptyWall(room: HTMLImageElement, W: number, H: number, bw: number, bh: number) {
  const SW = 96;
  const SH = Math.max(24, Math.round((H / W) * SW));
  const c = document.createElement("canvas");
  c.width = SW;
  c.height = SH;
  const g = c.getContext("2d", { willReadFrequently: true });
  const fallback = { x: (W - bw) / 2, y: H * 0.2 };
  if (!g) return fallback;
  g.drawImage(room, 0, 0, SW, SH);
  const d = g.getImageData(0, 0, SW, SH).data;
  const lum = new Float32Array(SW * SH);
  for (let i = 0; i < SW * SH; i++) lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  const E = new Float64Array((SW + 1) * (SH + 1));
  for (let y = 0; y < SH; y++) {
    let row = 0;
    for (let x = 0; x < SW; x++) {
      const gx = x + 1 < SW ? Math.abs(lum[y * SW + x + 1] - lum[y * SW + x]) : 0;
      const gy = y + 1 < SH ? Math.abs(lum[(y + 1) * SW + x] - lum[y * SW + x]) : 0;
      row += gx + gy;
      E[(y + 1) * (SW + 1) + x + 1] = E[y * (SW + 1) + x + 1] + row;
    }
  }
  const rect = (x0: number, y0: number, x1: number, y1: number) =>
    E[y1 * (SW + 1) + x1] - E[y0 * (SW + 1) + x1] - E[y1 * (SW + 1) + x0] + E[y0 * (SW + 1) + x0];
  const rw = Math.max(2, Math.round((bw / W) * SW));
  const rh = Math.max(2, Math.round((bh / H) * SH));
  if (rw >= SW - 1 || rh >= SH - 1) return fallback;
  const yMin = Math.round(SH * 0.06);
  const yMax = Math.min(Math.round(SH * 0.62) - rh, SH - rh - 1);
  let best = { score: Infinity, x: Math.round((SW - rw) / 2), y: yMin };
  for (let y = yMin; y <= Math.max(yMin, yMax); y++) {
    for (let x = 1; x <= SW - rw - 1; x++) {
      const mean = rect(x, y, x + rw, y + rh) / (rw * rh);
      const centre = Math.abs(x + rw / 2 - SW / 2) / SW;
      const score = mean * (1 + centre * 0.5) + y * 0.01;
      if (score < best.score) best = { score, x, y };
    }
  }
  return { x: (best.x / SW) * W, y: (best.y / SH) * H };
}

/** Simple canvas composite: draw up to 3 artworks onto the room photo. */
export async function canvasStagePreview(payload: StagePayload): Promise<{
  id: string;
  resultUrl: string;
  sourceUrl: string;
  provider: string;
}> {
  const room = await loadImage(ensureDataUrl(payload.sourceImageBase64));
  const style = styleById(payload.styleId);
  const arts = (payload.artworks || []).slice(0, 3);
  const canvas = document.createElement("canvas");
  canvas.width = room.naturalWidth || room.width;
  canvas.height = room.naturalHeight || room.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(room, 0, 0, canvas.width, canvas.height);

  const n = Math.max(arts.length, 1);
  const imgs: (HTMLImageElement | null)[] = [];
  for (let i = 0; i < arts.length; i++) {
    const url = arts[i].image_url || localImageForKey(arts[i].id || arts[i].title || "artwork", i);
    try {
      imgs.push(await loadImage(url));
    } catch {
      imgs.push(null); // skip broken artwork url
    }
  }
  const ok = imgs.filter((x): x is HTMLImageElement => !!x);
  if (arts.length && !ok.length) {
    throw new Error("We couldn't load the selected artwork photos, so nothing was placed. Please try again or pick a different piece.");
  }
  if (ok.length) {
    const gap = canvas.width * 0.03;
    const targetW = canvas.width * (n === 1 ? 0.26 : 0.19);
    const sizes = ok.map((img) => ({ w: targetW, h: (img.naturalHeight / img.naturalWidth) * targetW }));
    const blockW = sizes.reduce((a, z) => a + z.w, 0) + gap * (sizes.length - 1);
    const blockH = Math.max(...sizes.map((z) => z.h));
    const spot = findEmptyWall(room, canvas.width, canvas.height, blockW + 16, blockH + 16);
    let x = spot.x + 8;
    ok.forEach((img, i) => {
      const { w, h } = sizes[i];
      const y = spot.y + 8 + (blockH - h) / 2;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.38)";
      ctx.shadowBlur = canvas.width * 0.018;
      ctx.shadowOffsetX = canvas.width * 0.005;
      ctx.shadowOffsetY = canvas.width * 0.008;
      ctx.fillStyle = "rgba(20,16,12,0.95)";
      ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
      ctx.restore();
      ctx.drawImage(img, x, y, w, h);
      x += w + gap;
    });
  }

  const resultUrl = canvas.toDataURL("image/jpeg", 0.9);
  return {
    id: `preview_${Date.now()}`,
    resultUrl,
    sourceUrl: ensureDataUrl(payload.sourceImageBase64),
    provider: "canvas-preview",
  };
}

/**
 * Turn an artwork picture into a compact embedded JPEG (max 1024px) so the staging server
 * receives the real pixels of the selected piece and never has to fetch a relative or
 * cross-origin URL (which is what made the AI ignore the chosen artwork).
 */
export async function artworkToDataUrl(url: string, maxSide = 1024): Promise<string> {
  if (url.startsWith("data:")) return url;
  const absolute = new URL(url, window.location.origin).toString();
  const img = await loadImage(absolute);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
  const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.88);
}

export async function stageRoomClient(payload: StagePayload): Promise<{
  id: string;
  resultUrl: string;
  sourceUrl: string;
  provider?: string;
}> {
  const style = styleById(payload.styleId);
  // Embed the selected artworks' real pixels in the request.
  const embedded = await Promise.all(
    (payload.artworks || []).map(async (a) => {
      try {
        return { ...a, image_url: await artworkToDataUrl(a.image_url) };
      } catch {
        return a; // server will try to fetch it; canvas fallback handles the rest
      }
    }),
  );
  const body = {
    ...payload,
    artworks: embedded,
    stylePrompt: payload.stylePrompt || style?.prompt_fragment || "",
    styleName: style?.name || "Custom",
  };

  const {
    data: { session },
  } = await supabase.auth.getSession();

  try {
    const res = await fetch("/api/stage-room", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.resultUrl) {
      return {
        id: json.id || `stage_${Date.now()}`,
        resultUrl: json.resultUrl,
        sourceUrl: json.sourceUrl || ensureDataUrl(payload.sourceImageBase64),
        provider: json.provider,
      };
    }
    // 501 / missing function → canvas preview rather than dead end
    if (res.status === 404 || res.status === 501 || res.status === 502) {
      return canvasStagePreview({
        ...payload,
        artworks: payload.artworks,
      });
    }
    throw new Error(json?.error || `Staging failed (${res.status})`);
  } catch (e: any) {
    // Network / HTML SPA catch-all → canvas so Stage still does something visible
    if (!session || /Failed to fetch|Unexpected token|<!DOCTYPE/i.test(String(e?.message || e))) {
      return canvasStagePreview(payload);
    }
    throw e;
  }
}

function ensureDataUrl(s: string) {
  return s.startsWith("data:") ? s : `data:image/jpeg;base64,${s}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const tryLoad = (u: string, cors: boolean) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      if (cors) img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = u;
    });
  // Data/blob URLs never need CORS. Remote artwork photos try CORS first (so the canvas stays
  // exportable), then fall back to fetching the bytes and loading them from a local blob URL.
  return tryLoad(src, true).catch(async () => {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) throw new Error("Image load failed");
    const blob = await res.blob();
    return tryLoad(URL.createObjectURL(blob), false);
  });
}
