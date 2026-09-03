/**
 * Artist submission flow: upload → attributes → context → submit → approve → board.
 *
 * The insert runs from the browser against `public.artwork_submissions`, whose
 * RLS lets anyone create a row so long as it is 'pending'. Moderation and the
 * promotion into `artworks` happen server-side in /api/admin-bridge.
 */
import { supabase } from "@/integrations/supabase/client";
import { publicMessage } from "@/lib/public-message";

export const SUBMISSION_MEDIA = [
  { value: "oil", label: "Oil" },
  { value: "acrylic", label: "Acrylic" },
  { value: "watercolor", label: "Watercolour" },
  { value: "pastel", label: "Pastel" },
  { value: "drawing", label: "Drawing" },
  { value: "print", label: "Print" },
  { value: "photograph", label: "Photography" },
  { value: "sculpture", label: "Sculpture" },
  { value: "mixed_media", label: "Mixed media" },
] as const;

export const SUBMISSION_CURRENCIES = ["USD", "NGN", "GBP", "EUR", "ZAR", "GHS", "KES"];

export type SubmissionDraft = {
  artistName: string;
  submitterEmail: string;
  title: string;
  medium: string;
  widthCm: string;
  heightCm: string;
  depthCm: string;
  yearCreated: string;
  countryOfOrigin: string;
  priceAmount: string;
  priceCurrency: string;
  context: string;
};

const numeric = (value: string) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export function sizeText(draft: Pick<SubmissionDraft, "widthCm" | "heightCm" | "depthCm">): string | null {
  const parts = [numeric(draft.widthCm), numeric(draft.heightCm), numeric(draft.depthCm)].filter(
    (n): n is number => n !== null,
  );
  if (parts.length < 2) return null;
  return `${parts.join(" × ")} cm`;
}

/** Field-level messages keyed by draft field, so the form can show them inline. */
export function validateSubmission(draft: SubmissionDraft, image: string | null): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!image) errors.image = "Add a photo of the work.";
  if (!draft.artistName.trim()) errors.artistName = "Tell us who made this.";
  if (!draft.title.trim()) errors.title = "Give the work a title.";
  if (draft.submitterEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.submitterEmail.trim())) {
    errors.submitterEmail = "That email address does not look right.";
  }
  if (!numeric(draft.widthCm) || !numeric(draft.heightCm)) {
    errors.size = "Width and height in centimetres are required.";
  }
  if (!draft.yearCreated.trim()) errors.yearCreated = "Add the year the work was made.";
  else if (!/^\d{4}$/.test(draft.yearCreated.trim())) errors.yearCreated = "Use a four-digit year.";
  if (!draft.countryOfOrigin.trim()) errors.countryOfOrigin = "Add the country of origin.";
  if (draft.priceAmount.trim() && !numeric(draft.priceAmount)) {
    errors.priceAmount = "Enter a number, or leave price blank.";
  }
  if (draft.context.trim().length < 40) {
    errors.context = "Tell the story of this work — at least a couple of sentences.";
  }
  return errors;
}

/**
 * Storage keeps the file at a real https URL, which is what `artworks.image_url`
 * requires on approval. If the bucket is not reachable we keep the data URL and
 * the bridge re-hosts it at approval time, so a submission is never lost.
 */
async function hostImage(dataUrl: string): Promise<{ url: string; path: string | null }> {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
    const path = `inbox/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("submissions")
      .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("submissions").getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("No public URL");
    return { url: data.publicUrl, path };
  } catch {
    return { url: dataUrl, path: null };
  }
}

export async function submitArtwork(draft: SubmissionDraft, imageDataUrl: string) {
  const hosted = await hostImage(imageDataUrl);
  // `artwork_submissions` postdates the generated Database types.
  const { data, error } = await (supabase as any)
    .from("artwork_submissions")
    .insert({
      submitter_email: draft.submitterEmail.trim().toLowerCase() || null,
      submitter_name: draft.artistName.trim(),
      artist_name: draft.artistName.trim(),
      title: draft.title.trim(),
      medium: draft.medium || null,
      width_cm: numeric(draft.widthCm),
      height_cm: numeric(draft.heightCm),
      depth_cm: numeric(draft.depthCm),
      size_text: sizeText(draft),
      year_created: draft.yearCreated.trim() || null,
      country_of_origin: draft.countryOfOrigin.trim() || null,
      price_amount: numeric(draft.priceAmount),
      price_currency: draft.priceCurrency || "USD",
      context: draft.context.trim(),
      image_url: hosted.url,
      image_path: hosted.path,
      status: "pending",
    })
    .select("id, created_at")
    .maybeSingle();

  if (error) throw new Error(publicMessage(error, "Your submission could not be saved."));
  return { id: (data as any)?.id as string | undefined, hostedInStorage: hosted.path !== null };
}
