// Flutterwave subaccount payouts — admin-only vetting + toggle.
//
// Compliance intent: MyAfriArt never holds seller funds or raw bank details.
// An admin resolves the account name with Flutterwave first (adminVerifyBankAccount,
// nothing stored), then creates the subaccount (adminSetArtistSubaccount). Only the
// subaccount_id and display-safe fields land in our database — the account number
// passed to Flutterwave is never written here. Everything is gated by
// flutterwave_subaccounts_enabled (app_settings, defaults to false) and by whether
// an individual artist has a subaccount at all — existing checkout is unaffected
// until both are true for a given artwork's artist.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const __get_admin = () =>
  import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);
const assertAdmin = async (...__a: any[]): Promise<any> =>
  ((await import("./auth-helpers.server")).assertAdmin as any)(...__a);

const FLW_BASE = "https://api.flutterwave.com/v3";

function flwKey(): string {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) throw new Error("FLUTTERWAVE_SECRET_KEY not configured on this environment");
  return key;
}

// ---------- feature toggle (off by default) ----------
export const adminGetSubaccountsEnabled = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await (await __get_admin())
      .from("app_settings")
      .select("value")
      .eq("key", "flutterwave_subaccounts_enabled")
      .maybeSingle();
    return { enabled: data?.value === true || data?.value === "true" };
  });

export const adminSetSubaccountsEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await (await __get_admin()).from("app_settings").upsert({
      key: "flutterwave_subaccounts_enabled",
      value: data.enabled as any,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true, enabled: data.enabled };
  });

// ---------- bank list (for the admin dropdown — Flutterwave needs a bank code, not a name) ----------
export const listFlutterwaveBanks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ country: z.string().length(2).default("NG") })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const res = await fetch(`${FLW_BASE}/banks/${data.country}`, {
      headers: { Authorization: `Bearer ${flwKey()}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.status !== "success") {
      throw new Error(body?.message ?? "Could not fetch bank list from Flutterwave");
    }
    const banks = (Array.isArray(body.data) ? body.data : []) as { code?: string; name?: string }[];
    return { banks: banks.filter((b) => b.code && b.name).map((b) => ({ code: b.code!, name: b.name! })) };
  });

// ---------- verify only — resolves the account name, stores nothing ----------
export const adminVerifyBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        account_number: z.string().min(5).max(20),
        account_bank: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const res = await fetch(`${FLW_BASE}/accounts/resolve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${flwKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ account_number: data.account_number, account_bank: data.account_bank }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.status !== "success") {
      throw new Error(body?.message ?? "Could not verify that account with Flutterwave");
    }
    // Deliberately returns only the resolved name for the admin to eyeball —
    // nothing is persisted until adminSetArtistSubaccount is called next.
    return { account_name: (body.data?.account_name as string) ?? "" };
  });

// ---------- create/replace the artist's subaccount ----------
export const adminSetArtistSubaccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        artistId: z.string().uuid(),
        account_number: z.string().min(5).max(20),
        account_bank: z.string().min(1),
        business_name: z.string().min(2).max(120),
        business_mobile: z.string().min(6).max(20).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const admin = await __get_admin();

    // Artist's split = 100% minus the platform commission already configured
    // for MyAfriArt (existing broker_fee_percent setting). Falls back to 5%
    // if that setting is somehow missing.
    const { data: feeSetting } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "broker_fee_percent")
      .maybeSingle();
    const feePercentRaw = Number(feeSetting?.value ?? 5);
    const feePercent = Number.isFinite(feePercentRaw) ? feePercentRaw : 5;
    const artistSplitPercent = Math.max(1, Math.min(99, 100 - feePercent));

    const res = await fetch(`${FLW_BASE}/subaccounts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${flwKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        account_bank: data.account_bank,
        account_number: data.account_number,
        business_name: data.business_name,
        business_mobile: data.business_mobile ?? "",
        country: "NG",
        split_type: "percentage",
        split_value: artistSplitPercent / 100,
      }),
    });
    const body = await res.json().catch(() => ({}));
    const subaccountId = body?.data?.subaccount_id ?? body?.data?.id;
    if (!res.ok || body?.status !== "success" || !subaccountId) {
      console.error("Flutterwave subaccount creation failed", JSON.stringify(body).slice(0, 500));
      throw new Error(body?.message ?? "Flutterwave subaccount creation failed");
    }

    // Only the subaccount id and display-safe fields are ever persisted —
    // data.account_number above is used for this one outbound call and is
    // never written to our database.
    const last4 = data.account_number.slice(-4);
    const { error } = await admin
      .from("artists")
      .update({
        flutterwave_subaccount_id: String(subaccountId),
        payout_bank_code: data.account_bank,
        payout_account_last4: last4,
        payout_verified_name: data.business_name,
        payout_updated_at: new Date().toISOString(),
      })
      .eq("id", data.artistId);
    if (error) throw new Error(error.message);

    return { ok: true, subaccountId: String(subaccountId), artistSplitPercent };
  });

export const adminClearArtistSubaccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ artistId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await (await __get_admin())
      .from("artists")
      .update({
        flutterwave_subaccount_id: null,
        payout_bank_code: null,
        payout_account_last4: null,
        payout_verified_name: null,
        payout_updated_at: new Date().toISOString(),
      })
      .eq("id", data.artistId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListArtistPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await (await __get_admin())
      .from("artists")
      .select(
        "id, name, flutterwave_subaccount_id, payout_bank_code, payout_account_last4, payout_verified_name, payout_updated_at",
      )
      .order("name");
    if (error) throw new Error(error.message);
    return { artists: data ?? [] };
  });

// Server-side lookup used by payments.functions.ts at checkout time. Not a
// createServerFn — plain internal helper, only ever called from our own
// server code, never exposed to the client.
export async function getArtistSubaccountForCheckout(
  artistId: string,
): Promise<{ subaccountId: string } | null> {
  const admin = await __get_admin();
  const { data: enabledRow } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "flutterwave_subaccounts_enabled")
    .maybeSingle();
  const enabled = enabledRow?.value === true || enabledRow?.value === "true";
  if (!enabled) return null;

  const { data: artist } = await admin
    .from("artists")
    .select("flutterwave_subaccount_id")
    .eq("id", artistId)
    .maybeSingle();
  if (!artist?.flutterwave_subaccount_id) return null;
  return { subaccountId: artist.flutterwave_subaccount_id as string };
}
