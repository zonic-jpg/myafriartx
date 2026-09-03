// Outreach artist profiles — curated African artists from
// data/nigerian-artists-outreach-100.csv + data/african-artists-outreach-regional.json.
// Their profile links (/artist/ART-OUT-###) resolve once rows exist in `artists`.
//
// Seeding runs in the browser against the signed-in admin's Supabase session
// (RLS policy `artists_admin_write`), the same way MyYangaX Admin → Blog seeds
// its default posts. Migrations seed the same rows server-side; both are
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
 * Upsert all outreach profiles and their public-reference works.
 * Requires a signed-in Supabase admin session.
 */
export async function seedOutreachArtists() {
  const [{ OUTREACH_ARTIST_SEEDS }, { OUTREACH_WORK_SEEDS }] = await Promise.all([
    import("./outreach-artists.data"),
    import("./outreach-works.data"),
  ]);

  const rows = OUTREACH_ARTIST_SEEDS.map((seed) => ({
    ...seed,
    profile_status: OUTREACH_PROFILE_STATUS,
    content_source: OUTREACH_CONTENT_SOURCE,
  }));

  const { error: artistError } = await supabase
    .from("artists")
    .upsert(rows as never, { onConflict: "short_code" });
  if (artistError) throw new Error(artistError.message);

  const { data: artists, error: lookupError } = await supabase
    .from("artists")
    .select("id, short_code")
    .in(
      "short_code",
      OUTREACH_ARTIST_SEEDS.map((s) => s.short_code),
    );
  if (lookupError) throw new Error(lookupError.message);

  const idByCode = new Map((artists ?? []).map((a) => [a.short_code, a.id]));
  const workRows = OUTREACH_WORK_SEEDS.map((w) => ({
    ...w,
    artist_id: idByCode.get(w.artist_short_code) ?? null,
  })).filter((w) => w.artist_id);

  if (workRows.length) {
    const { error: workError } = await supabase
      .from("outreach_works")
      .upsert(workRows as never, { onConflict: "artist_short_code,slot" });
    if (workError) throw new Error(workError.message);
  }

  return { ok: true as const, count: rows.length, works: workRows.length };
}
