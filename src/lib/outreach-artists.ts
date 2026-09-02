// Outreach artist profiles — curated Nigerian artists from
// data/nigerian-artists-outreach-100.csv. Their advertised profile links
// (/artist/ART-OUT-001 …) resolve once these rows exist in `artists`.
//
// Seeding runs in the browser against the signed-in admin's Supabase session
// (RLS policy `artists_admin_write`), the same way MyYangaX Admin → Blog seeds
// its default posts. The migration seeds the same rows server-side; both are
// idempotent upserts keyed on short_code, so running either or both is safe.
import { supabase } from "@/integrations/supabase/client";

export const OUTREACH_PROFILE_STATUS = "unclaimed_outreach";
export const OUTREACH_CONTENT_SOURCE = "outreach";

/** CSV websites are bare domains ("pejualatise.com"); make them linkable. */
export function outreachWebsiteHref(website: string | null | undefined): string | null {
  const value = (website ?? "").trim();
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/**
 * Upsert all outreach profiles. Requires a signed-in Supabase admin session.
 * The seed payload is ~25 kB, so it is only fetched when an admin runs this.
 */
export async function seedOutreachArtists() {
  const { OUTREACH_ARTIST_SEEDS } = await import("./outreach-artists.data");
  const rows = OUTREACH_ARTIST_SEEDS.map((seed) => ({
    ...seed,
    profile_status: OUTREACH_PROFILE_STATUS,
    content_source: OUTREACH_CONTENT_SOURCE,
  }));
  const { error } = await supabase
    .from("artists")
    .upsert(rows as never, { onConflict: "short_code" });
  if (error) throw new Error(error.message);
  return { ok: true as const, count: rows.length };
}
