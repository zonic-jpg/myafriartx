/**
 * Client for POST /api/admin-bridge (netlify/functions/admin-bridge.mjs).
 *
 * The owner signs in through the soft orbit gate, which holds no Supabase JWT,
 * so privileged reads and writes cannot go through RLS from the browser. They go
 * through this one serverless door instead, carrying the gate identity plus any
 * Supabase session that happens to exist.
 */
import { supabase } from "@/integrations/supabase/client";
import { adminGateEmail } from "@/lib/adminGate";
import { publicMessage } from "@/lib/public-message";

const ENDPOINT = "/api/admin-bridge";
const CONSOLE_KEY_STORAGE = "myafriart_owner_console_key";

export class BridgeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BridgeUnavailableError";
  }
}

export function ownerConsoleKey(): string {
  try {
    return localStorage.getItem(CONSOLE_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

export function setOwnerConsoleKey(key: string): void {
  try {
    if (key) localStorage.setItem(CONSOLE_KEY_STORAGE, key);
    else localStorage.removeItem(CONSOLE_KEY_STORAGE);
  } catch {
    /* private mode */
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const gate = adminGateEmail();
  if (gate) headers["x-admin-email"] = gate;
  const key = ownerConsoleKey();
  if (key) headers["x-admin-key"] = key;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  } catch {
    /* anonymous soft gate */
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
