/** Per-service Free | Freemium | Paid. Stored in the database (service_pricing) and enforced server-side. */
import { supabase } from "@/integrations/supabase/client";

export type ServicePricingMode = "free" | "freemium" | "paid";

export type ServicePricingRow = {
  id: string;
  label: string;
  mode: ServicePricingMode;
  priceNgn: number;
  guestAllowance: number;
};

export type ServiceGateResult = {
  mode: ServicePricingMode;
  priceNgn: number;
  guestAllowance: number;
  signedIn: boolean;
  hasAccess: boolean;
  allowed: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function listServicePricing(): Promise<ServicePricingRow[]> {
  const { data, error } = await db.from("service_pricing").select("id,label,mode,price_ngn,guest_allowance").order("id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    label: String(r.label),
    mode: r.mode as ServicePricingMode,
    priceNgn: Number(r.price_ngn) || 0,
    guestAllowance: Number(r.guest_allowance) || 0,
  }));
}

export async function activateServicePricing(row: ServicePricingRow): Promise<void> {
  const { error } = await db.rpc("admin_set_service_pricing", {
    p_id: row.id,
    p_mode: row.mode,
    p_price: Math.round(row.priceNgn || 0),
    p_guest: Math.round(row.guestAllowance || 0),
  });
  if (error) throw new Error(error.message);
}

export async function serviceGate(id: string): Promise<ServiceGateResult> {
  const { data, error } = await db.rpc("service_gate", { p_service: id });
  if (error || !data) return { mode: "free", priceNgn: 0, guestAllowance: 0, signedIn: false, hasAccess: false, allowed: true };
  return {
    mode: data.mode,
    priceNgn: Number(data.price_ngn) || 0,
    guestAllowance: Number(data.guest_allowance) || 0,
    signedIn: !!data.signed_in,
    hasAccess: !!data.has_access,
    allowed: data.allowed !== false,
  };
}

export function isServicePricingVisible(row: Pick<ServicePricingRow, "mode">): boolean {
  return row.mode !== "free";
}
