import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

type RenderImageFields = {
  source_image_url?: string | null;
  result_image_url?: string | null;
};

export async function signRenderImageUrls<T extends RenderImageFields>(render: T): Promise<T> {
  const [sourceUrl, resultUrl] = await Promise.all([
    createPrivateImageUrl("rooms", render.source_image_url),
    createPrivateImageUrl("renders", render.result_image_url),
  ]);

  return {
    ...render,
    source_image_url: sourceUrl,
    result_image_url: resultUrl,
  };
}

export async function createPrivateImageUrl(bucket: "rooms" | "renders", value?: string | null) {
  const path = storagePathFromValue(bucket, value);
  if (!path) return value ?? null;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error(`Could not create signed URL for ${bucket}/${path}:`, error.message);
    return value ?? null;
  }

  return data.signedUrl;
}

function storagePathFromValue(bucket: string, value?: string | null) {
  if (!value || value.startsWith("data:")) return null;
  if (!value.startsWith("http")) return value.replace(/^\/+/, "");

  try {
    const url = new URL(value);
    const match = url.pathname.match(
      new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/(.+)$`),
    );
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}
