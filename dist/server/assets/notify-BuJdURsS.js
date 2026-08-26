import { jsx, jsxs } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { u as useServerFn, g as getNotifyPreferences, a as upsertNotifyPreferences, b as generateMyReelNow } from "./router-9tDYEkuI.js";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { s as supabase } from "./client-BWo_yy_6.js";
import { toast } from "sonner";
import "./createSsrRpc-Def-olcZ.js";
import "./server-xISFJUTE.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "zod";
import "./auth-middleware-DPJJ5M9W.js";
import "@supabase/supabase-js";
import "@tanstack/zod-adapter";
import "ai";
import "@ai-sdk/openai-compatible";
import "node:crypto";
import "jose";
import "./client.server-D5ro3rAQ.js";
const MEDIA = ["oil", "watercolor", "pastel", "sculpture", "photograph", "print", "mixed_media"];
const GENDERS = ["male", "female", "other"];
function NotifyPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(null);
  useEffect(() => {
    const {
      data: sub
    } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    supabase.auth.getSession().then(({
      data
    }) => setAuthed(!!data.session));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (authed === false) navigate({
      to: "/login"
    });
  }, [authed, navigate]);
  if (authed === null) return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center text-muted-foreground", children: "Loading…" });
  if (!authed) return null;
  return /* @__PURE__ */ jsx(NotifyInner, {});
}
function NotifyInner() {
  const qc = useQueryClient();
  const getPrefs = useServerFn(getNotifyPreferences);
  const savePrefs = useServerFn(upsertNotifyPreferences);
  const genNow = useServerFn(generateMyReelNow);
  const {
    data,
    isLoading
  } = useQuery({
    queryKey: ["notify", "prefs"],
    queryFn: () => getPrefs()
  });
  const max = data?.maxFrequencyPerWeek ?? 3;
  const p = data?.preferences;
  const [enabled, setEnabled] = useState(true);
  const [freq, setFreq] = useState(1);
  const [categories, setCategories] = useState([]);
  const [countries, setCountries] = useState("");
  const [genders, setGenders] = useState([]);
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [currency, setCurrency] = useState("USD");
  useEffect(() => {
    if (!p) return;
    setEnabled(p.enabled);
    setFreq(Math.min(p.frequency_per_week, max));
    setCategories(p.categories ?? []);
    setCountries((p.countries ?? []).join(", "));
    setGenders(p.genders ?? []);
    setAgeMin(p.artist_age_min?.toString() ?? "");
    setAgeMax(p.artist_age_max?.toString() ?? "");
    setPriceMin(p.price_min?.toString() ?? "");
    setPriceMax(p.price_max?.toString() ?? "");
    setCurrency(p.currency ?? "USD");
  }, [p, max]);
  const save = useMutation({
    mutationFn: () => savePrefs({
      data: {
        enabled,
        frequency_per_week: freq,
        categories,
        countries: countries.split(",").map((s) => s.trim()).filter(Boolean),
        genders,
        artist_age_min: ageMin ? parseInt(ageMin, 10) : null,
        artist_age_max: ageMax ? parseInt(ageMax, 10) : null,
        price_min: priceMin ? parseFloat(priceMin) : null,
        price_max: priceMax ? parseFloat(priceMax) : null,
        currency
      }
    }),
    onSuccess: () => {
      toast.success("Preferences saved");
      qc.invalidateQueries({
        queryKey: ["notify"]
      });
    },
    onError: (e) => toast.error(e.message ?? "Save failed")
  });
  const sample = useMutation({
    mutationFn: () => genNow(),
    onSuccess: (r) => {
      if (r.reelId) {
        toast.success("Sample reel ready");
        window.location.href = `/notify/reel/${r.reelId}`;
      } else toast.info("No artworks match your filters yet — try widening them.");
    },
    onError: (e) => toast.error(e.message ?? "Failed")
  });
  if (isLoading) return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center text-muted-foreground", children: "Loading…" });
  const toggle = (arr, setter, v) => setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx("header", { className: "border-b border-border", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-3xl items-center justify-between px-6 py-4", children: [
      /* @__PURE__ */ jsx(Link, { to: "/", className: "font-display text-xl", children: "MyAfriart" }),
      /* @__PURE__ */ jsxs("nav", { className: "flex items-center gap-4 text-sm", children: [
        /* @__PURE__ */ jsx(Link, { to: "/notify/inbox", className: "text-muted-foreground hover:text-foreground", children: "Inbox" }),
        /* @__PURE__ */ jsx(Link, { to: "/studio", className: "text-muted-foreground hover:text-foreground", children: "Studio" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("main", { className: "mx-auto max-w-3xl px-6 py-10", children: [
      /* @__PURE__ */ jsx("h1", { className: "font-display text-3xl", children: "NotifyMe" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Get a curated 12-pane reel of African art tuned to your taste. We send it in-app first; email is the backup." }),
      /* @__PURE__ */ jsxs("section", { className: "mt-8 space-y-6 rounded-lg border border-border bg-card p-6", children: [
        /* @__PURE__ */ jsxs("label", { className: "flex items-center justify-between gap-4", children: [
          /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Enable NotifyMe" }),
          /* @__PURE__ */ jsx("input", { type: "checkbox", className: "h-5 w-5 accent-primary", checked: enabled, onChange: (e) => setEnabled(e.target.checked) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsx("label", { className: "font-medium", children: "Reels per week" }),
            /* @__PURE__ */ jsxs("span", { className: "text-sm text-muted-foreground", children: [
              freq,
              " / ",
              max,
              " max"
            ] })
          ] }),
          /* @__PURE__ */ jsx("input", { type: "range", min: 1, max, value: freq, onChange: (e) => setFreq(parseInt(e.target.value, 10)), className: "mt-2 w-full" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "font-medium", children: "Categories" }),
          /* @__PURE__ */ jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: MEDIA.map((m) => /* @__PURE__ */ jsx("button", { type: "button", onClick: () => toggle(categories, setCategories, m), className: `rounded-full border px-3 py-1 text-xs capitalize ${categories.includes(m) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`, children: m.replace("_", " ") }, m)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "font-medium", children: "Artist countries" }),
          /* @__PURE__ */ jsx("input", { value: countries, onChange: (e) => setCountries(e.target.value), placeholder: "Nigeria, Kenya, Senegal", className: "mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "Comma-separated. Leave blank for any country." })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "font-medium", children: "Artist gender" }),
          /* @__PURE__ */ jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: GENDERS.map((g) => /* @__PURE__ */ jsx("button", { type: "button", onClick: () => toggle(genders, setGenders, g), className: `rounded-full border px-3 py-1 text-xs capitalize ${genders.includes(g) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`, children: g }, g)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "font-medium", children: "Artist age min" }),
            /* @__PURE__ */ jsx("input", { type: "number", value: ageMin, onChange: (e) => setAgeMin(e.target.value), className: "mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "font-medium", children: "Artist age max" }),
            /* @__PURE__ */ jsx("input", { type: "number", value: ageMax, onChange: (e) => setAgeMax(e.target.value), className: "mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "font-medium", children: "Price min" }),
            /* @__PURE__ */ jsx("input", { type: "number", value: priceMin, onChange: (e) => setPriceMin(e.target.value), className: "mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "font-medium", children: "Price max" }),
            /* @__PURE__ */ jsx("input", { type: "number", value: priceMax, onChange: (e) => setPriceMax(e.target.value), className: "mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "font-medium", children: "Currency" }),
            /* @__PURE__ */ jsx("input", { value: currency, maxLength: 3, onChange: (e) => setCurrency(e.target.value.toUpperCase()), className: "mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-3 pt-2", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => save.mutate(), disabled: save.isPending, className: "rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50", children: save.isPending ? "Saving…" : "Save preferences" }),
          /* @__PURE__ */ jsx("button", { onClick: () => sample.mutate(), disabled: sample.isPending, className: "rounded-md border border-border px-5 py-2 text-sm hover:bg-accent disabled:opacity-50", children: sample.isPending ? "Building…" : "Send me a sample reel now" })
        ] })
      ] })
    ] })
  ] });
}
export {
  NotifyPage as component
};
