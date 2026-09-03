/**
 * Client for POST /api/admin-bridge (netlify/functions/admin-bridge.mjs).
 *
 * Privileged reads and writes go through this one serverless door, carrying a
 * Supabase JWT when present and/or the orbit gate password verified server-side.
 * Client email headers are never used as proof of ownership.
 */
import { supabase } from "@/integrations/supabase/client";
import { adminGateOrbitPassword } from "@/lib/adminGate";
import { publicMessage } from "@/lib/public-message";

const ENDPOINT = "/api/admin-bridge";

export class BridgeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BridgeUnavailableError";
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const orbitPassword = adminGateOrbitPassword();
  if (orbitPassword) headers["x-orbit-gate-password"] = orbitPassword;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  } catch {
    /* orbit gate without Supabase JWT */
  }
  return headers;
}

export async function callAdminBridge<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ action, ...payload }),
    });
  } catch (e) {
    throw new BridgeUnavailableError(publicMessage(e, "Could not reach the admin service."));
  }

  // A static deployment without the function returns the SPA shell, not JSON.
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new BridgeUnavailableError(
      "The admin service is not deployed on this site yet. Redeploy from GitHub so /api/admin-bridge exists.",
    );
  }

  if (!res.ok) {
    const message = publicMessage(json?.error, "That admin action failed.");
    if (res.status === 404 || res.status === 501) throw new BridgeUnavailableError(message);
    throw new Error(message);
  }
  return json as T;
}

export type AccessRequest = {
  id: string;
  email: string;
  identity: string | null;
  app: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
};

export type ArtworkSubmission = {
  id: string;
  submitter_email: string | null;
  submitter_name: string | null;
  artist_name: string;
  title: string;
  medium: string | null;
  category: string | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  size_text: string | null;
  year_created: string | null;
  country_of_origin: string | null;
  price_amount: number | null;
  price_currency: string | null;
  context: string | null;
  image_url: string;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  artwork_id: string | null;
  created_at: string;
};

export type SentLetter = {
  id: string;
  audience: string;
  recipient_brand: string;
  recipient_email: string;
  subject: string;
  status: "sending" | "sent" | "failed";
  error_message: string | null;
  created_at: string;
};

export type BridgeArtist = {
  id: string;
  name: string;
  country: string | null;
  portrait_url: string | null;
  content_source?: string;
  exhibition_interest?: boolean;
  exhibition_notes?: string | null;
};

export type BridgeArtwork = {
  id: string;
  artist_id: string | null;
  title: string;
  image_url: string;
  medium?: string | null;
  year?: string | null;
  is_active?: boolean;
};

/**
 * Real artist/artwork catalogue, regardless of auth path. BatchUploadAdmin's
 * artists/artworks props are sourced from a dead TanStack server fn, so in
 * orbit-gate mode (how the real owner actually signs in — production has
 * zero rows in auth.users) they were silently mock data. This is the real
 * source.
 */
export const fetchCatalogue = () =>
  callAdminBridge<{ artists: BridgeArtist[]; artworks: BridgeArtwork[] }>("catalogue.list");

export const updateArtist = (patch: { id: string } & Partial<BridgeArtist>) =>
  callAdminBridge<{ artist: BridgeArtist }>("artists.update", patch);

export const fetchExhibitionInterest = () =>
  callAdminBridge<{ groups: { notes: string; artists: { id: string; name: string }[] }[]; total: number }>(
    "artists.exhibitionInterest",
  );
