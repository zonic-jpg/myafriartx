/**
 * One place for currency conversion, shared by the catalogue, the price filter and the
 * piece page. Works are stored in the currency their owner priced them in (USD or NGN),
 * so every comparison and every display goes through here. Checkout converts separately
 * on the server (payments.functions.ts) and is the only amount that is ever charged.
 */
import { useEffect, useSyncExternalStore } from "react";

export const FALLBACK_USD_TO_NGN = 1600;
export type DisplayCurrency = "USD" | "NGN";
type State = { currency: DisplayCurrency; usdToNgn: number };

let state: State = { currency: "USD", usdToNgn: FALLBACK_USD_TO_NGN };
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Set by the page that owns the currency switch and the live rate. */
export function setDisplayCurrency(currency: DisplayCurrency, usdToNgn: number) {
  const rate = Number.isFinite(usdToNgn) && usdToNgn > 0 ? usdToNgn : FALLBACK_USD_TO_NGN;
  if (state.currency === currency && state.usdToNgn === rate) return;
  state = { currency, usdToNgn: rate };
  listeners.forEach((fn) => fn());
}

/** The currency visitors chose to see prices in, and the rate in use. */
export function useDisplayCurrency(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

let rateRequested = false;
/** Fetches the day's rate once per visit, for pages that do not own the switch. */
export function useLiveUsdToNgn(): State {
  const s = useDisplayCurrency();
  useEffect(() => {
    if (rateRequested) return;
    rateRequested = true;
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((j) => {
        const rate = j?.rates?.NGN;
        if (typeof rate === "number" && rate > 0) setDisplayCurrency(state.currency, rate);
      })
      .catch(() => {});
  }, []);
  return s;
}

const own = (currency: string | null | undefined) => String(currency ?? "USD").trim().toUpperCase();

/** A stored price expressed in US dollars, whatever currency it was entered in. */
export function priceInUsd(price: number | null | undefined, currency: string | null | undefined, usdToNgn: number): number | null {
  if (typeof price !== "number" || !Number.isFinite(price)) return null;
  return own(currency) === "NGN" ? price / (usdToNgn > 0 ? usdToNgn : FALLBACK_USD_TO_NGN) : price;
}

const sign = (c: DisplayCurrency) => (c === "NGN" ? "₦" : "$");

/** A stored price shown in the chosen currency. Converted figures are marked "≈". */
export function formatPrice(price: number | null | undefined, currency: string | null | undefined, display: DisplayCurrency, usdToNgn: number): string | null {
  const usd = priceInUsd(price, currency, usdToNgn);
  if (usd === null || typeof price !== "number" || price <= 0) return null; // an unpriced work shows no price
  if (own(currency) === display) return `${sign(display)}${Math.round(price).toLocaleString()}`;
  const converted = display === "NGN" ? usd * usdToNgn : usd;
  return `≈ ${sign(display)}${Math.round(converted).toLocaleString()}`;
}

/** For a piece page: the stored price, then its equivalent in the other currency. */
export function priceWithEquivalent(price: number | null | undefined, currency: string | null | undefined, usdToNgn: number): string {
  if (typeof price !== "number" || !Number.isFinite(price)) return "—";
  const c = own(currency) === "NGN" ? "NGN" : "USD";
  const other: DisplayCurrency = c === "NGN" ? "USD" : "NGN";
  const equivalent = formatPrice(price, c, other, usdToNgn);
  return `${c} ${Math.round(price).toLocaleString()}${equivalent ? ` (${equivalent})` : ""}`;
}
