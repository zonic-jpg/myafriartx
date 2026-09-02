/**
 * Client-side ArtStage staging for static Netlify.
 * Prefers POST /api/stage-room (Netlify Function). Falls back to canvas hang preview
 * when the function is missing, AI is unconfigured, or the user is on admin-gate only.
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

export async function fetchStudioCatalogClient(gateMode = false) {
  if (gateMode) {
    return {
      artworks: LOCAL_MOCK_ARTWORKS,
      artists: LOCAL_MOCK_ARTISTS,
      styles: LOCAL_MOCK_STYLES,
      source: "gate-mock" as const,
    };
  }

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
  for (let i = 0; i < arts.length; i++) {
    const url = localImageForKey(arts[i].image_url) || arts[i].image_url;
    try {
      const img = await loadImage(url);
      const targetW = canvas.width * (n === 1 ? 0.28 : 0.22);
      const scale = targetW / img.naturalWidth;
      const w = targetW;
      const h = img.naturalHeight * scale;
      const gap = canvas.width * 0.04;
      const totalW = n * w + (n - 1) * gap;
      const x = (canvas.width - totalW) / 2 + i * (w + gap);
      const y = canvas.height * 0.22;
      // frame
      ctx.fillStyle = "rgba(20,16,12,0.92)";
      ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
      ctx.drawImage(img, x, y, w, h);
      // soft shadow
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(x + 6, y + h + 8, w, 10);
    } catch {
      /* skip broken artwork url */
    }
  }

  if (style) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(16, canvas.height - 48, Math.min(420, canvas.width - 32), 32);
    ctx.fillStyle = "#f5efe6";
    ctx.font = "600 14px system-ui,sans-serif";
    ctx.fillText(`Preview · ${style.name}`, 28, canvas.height - 28);
  }

  const resultUrl = canvas.toDataURL("image/jpeg", 0.9);
  return {
    id: `preview_${Date.now()}`,
    resultUrl,
    sourceUrl: ensureDataUrl(payload.sourceImageBase64),
    provider: "canvas-preview",
  };
}

export async function stageRoomClient(payload: StagePayload): Promise<{
  id: string;
  resultUrl: string;
  sourceUrl: string;
  provider?: string;
}> {
  const style = styleById(payload.styleId);
  const body = {
    ...payload,
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
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}
