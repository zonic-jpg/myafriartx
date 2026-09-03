/**
 * Client for the Content Intake Studio Netlify Function (/api/content-intake).
 * Replaces the old createServerFn/useServerFn calls, which have no backend
 * under this app's static-Netlify deploy — same fetch+bearer-token pattern
 * as stageRoomClient in stage-room-client.ts.
 */
import { supabase } from "@/integrations/supabase/client";
import { adminGateActive, adminGatePassword } from "@/lib/adminGate";

export type StagedItemInput = {
  source_name?: string;
  image_hash?: string;
  image_url?: string;
  title: string;
  category?: string;
  subcategory?: string;
  description?: string;
  attributes?: Record<string, unknown>;
  cultural_tags?: string[];
  price_band?: string;
  needs_vetting?: boolean;
  confidence?: number;
  artist_id: string;
  medium?: string;
  year?: string;
  origin?: string;
};

export type StagedItem = StagedItemInput & {
  id: string;
  status: string;
  staged_by: string;
  created_at: string;
};

export type Artist = {
  id: string;
  name: string;
  bio?: string | null;
  country?: string | null;
  portrait_url?: string | null;
  content_source?: string;
  exhibition_interest?: boolean;
  exhibition_notes?: string | null;
  created_at?: string;
};

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Real Supabase sessions are rare today — production has no signed-up
  // users yet, so the actual admin/owner gets in through the site's
  // client-side password gate (adminGate.ts). Send whichever credential is
  // available; the function accepts either (see content-intake.mjs).
  const gatePw = adminGateActive() ? adminGatePassword() : null;
  if (!session?.access_token && !gatePw) {
    throw new Error("Not signed in as admin");
  }

  const res = await fetch("/api/content-intake", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(gatePw ? { "x-admin-gate-password": gatePw } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `${action} failed (${res.status})`);
  return json as T;
}

export const listArtists = () => call<{ artists: Artist[] }>("listArtists");

export const createArtist = (data: { name: string; bio?: string; country?: string; portrait_url?: string }) =>
  call<{ artist: Artist }>("createArtist", data);

export const updateArtist = (data: { id: string } & Partial<Artist>) =>
  call<{ artist: Artist }>("updateArtist", data);

export type EnrichedImage = {
  title: string;
  category: string;
  subcategory?: string;
  description?: string;
  attributes?: Record<string, unknown>;
  culturalTags?: string[];
  suggestedPriceBand?: string;
  quality?: string[];
  needsVetting?: boolean;
  confidence?: number;
  note?: string;
  imageUrl: string;
};

export const enrichImage = (data: {
  imageBase64: string;
  mediaType: string;
  categories: string[];
  noun?: string;
  appName?: string;
}) => call<EnrichedImage>("enrichImage", data);

export const exhibitionInterest = () =>
  call<{ groups: { notes: string; artists: { id: string; name: string }[] }[]; total: number }>(
    "exhibitionInterest",
  );

export const bulkStage = (items: StagedItemInput[]) =>
  call<{ ok: boolean; staged: number; received: number }>("bulkStage", { items });

export const listStagedForArtist = (artist_id: string) =>
  call<{ items: StagedItem[] }>("listStagedForArtist", { artist_id });

export const listPendingQueue = () =>
  call<{ artists: { id: string; name: string; portrait_url: string | null; items: StagedItem[] }[] }>(
    "listPendingQueue",
  );

export const approveArtistBatch = (artist_id: string) =>
  call<{ ok: boolean; published: number; heldForVetting: number }>("approveArtistBatch", { artist_id });

export const deleteStagedItem = (id: string) => call<{ ok: boolean }>("deleteStagedItem", { id });
