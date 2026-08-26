import { supabaseAdmin } from "./client.server-D5ro3rAQ.js";
import "@supabase/supabase-js";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
async function signRenderImageUrls(render) {
  const [sourceUrl, resultUrl] = await Promise.all([
    createPrivateImageUrl("rooms", render.source_image_url),
    createPrivateImageUrl("renders", render.result_image_url)
  ]);
  return {
    ...render,
    source_image_url: sourceUrl,
    result_image_url: resultUrl
  };
}
async function createPrivateImageUrl(bucket, value) {
  const path = storagePathFromValue(bucket, value);
  if (!path) return value ?? null;
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.error(`Could not create signed URL for ${bucket}/${path}:`, error.message);
    return value ?? null;
  }
  return data.signedUrl;
}
function storagePathFromValue(bucket, value) {
  if (!value || value.startsWith("data:")) return null;
  if (!value.startsWith("http")) return value.replace(/^\/+/, "");
  try {
    const url = new URL(value);
    const match = url.pathname.match(
      new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/(.+)$`)
    );
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}
export {
  createPrivateImageUrl,
  signRenderImageUrls
};
