import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  getNotifyPreferences,
  upsertNotifyPreferences,
  generateMyReelNow,
} from "@/lib/notify.functions";

export const Route = createFileRoute("/notify")({
  head: () => ({ meta: [{ title: "NotifyMe — MyAfriArt" }] }),
  component: NotifyPage,
});

const MEDIA = [
  "oil",
  "watercolor",
  "pastel",
  "sculpture",
  "photograph",
  "print",
  "mixed_media",
] as const;
const GENDERS = ["male", "female", "other"] as const;

function NotifyPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (authed === false) navigate({ to: "/login" });
  }, [authed, navigate]);

  if (authed === null)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  if (!authed) return null;
  return <NotifyInner />;
}

function NotifyInner() {
  const qc = useQueryClient();
  const getPrefs = useServerFn(getNotifyPreferences);
  const savePrefs = useServerFn(upsertNotifyPreferences);
  const genNow = useServerFn(generateMyReelNow);

  const { data, isLoading } = useQuery({
    queryKey: ["notify", "prefs"],
    queryFn: () => getPrefs(),
  });
  const max = data?.maxFrequencyPerWeek ?? 3;
  const p = data?.preferences;

  const [enabled, setEnabled] = useState(true);
  const [freq, setFreq] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [countries, setCountries] = useState<string>("");
  const [genders, setGenders] = useState<string[]>([]);
  const [ageMin, setAgeMin] = useState<string>("");
  const [ageMax, setAgeMax] = useState<string>("");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
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
    mutationFn: () =>
      savePrefs({
        data: {
          enabled,
          frequency_per_week: freq,
          categories: categories as any,
          countries: countries
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          genders: genders as any,
          artist_age_min: ageMin ? parseInt(ageMin, 10) : null,
          artist_age_max: ageMax ? parseInt(ageMax, 10) : null,
          price_min: priceMin ? parseFloat(priceMin) : null,
          price_max: priceMax ? parseFloat(priceMax) : null,
          currency,
        },
      }),
    onSuccess: () => {
      toast.success("Preferences saved");
      qc.invalidateQueries({ queryKey: ["notify"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const sample = useMutation({
    mutationFn: () => genNow(),
    onSuccess: (r: any) => {
      if (r.reelId) {
        toast.success("Sample reel ready");
        window.location.href = `/notify/reel/${r.reelId}`;
      } else toast.info("No artworks match your filters yet — try widening them.");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );

  const toggle = (arr: string[], setter: (x: string[]) => void, v: string) =>
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-xl">
            MyAfriArt
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/notify/inbox" className="text-muted-foreground hover:text-foreground">
              Inbox
            </Link>
            <Link to="/studio" className="text-muted-foreground hover:text-foreground">
              Studio
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-3xl">NotifyMe</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Get a curated 12-pane reel of African art tuned to your taste. We send it in-app first;
          email is the backup.
        </p>

        <section className="mt-8 space-y-6 rounded-lg border border-border bg-card p-6">
          <label className="flex items-center justify-between gap-4">
            <span className="font-medium">Enable NotifyMe</span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
          </label>

          <div>
            <div className="flex items-center justify-between">
              <label className="font-medium">Reels per week</label>
              <span className="text-sm text-muted-foreground">
                {freq} / {max} max
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={max}
              value={freq}
              onChange={(e) => setFreq(parseInt(e.target.value, 10))}
              className="mt-2 w-full"
            />
          </div>

          <div>
            <div className="font-medium">Categories</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {MEDIA.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggle(categories, setCategories, m)}
                  className={`rounded-full border px-3 py-1 text-xs capitalize ${categories.includes(m) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {m.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-medium">Artist countries</label>
            <input
              value={countries}
              onChange={(e) => setCountries(e.target.value)}
              placeholder="Nigeria, Kenya, Senegal"
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Comma-separated. Leave blank for any country.
            </p>
          </div>

          <div>
            <div className="font-medium">Artist gender</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggle(genders, setGenders, g)}
                  className={`rounded-full border px-3 py-1 text-xs capitalize ${genders.includes(g) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-medium">Artist age min</label>
              <input
                type="number"
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="font-medium">Artist age max</label>
              <input
                type="number"
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="font-medium">Price min</label>
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="font-medium">Price max</label>
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="font-medium">Currency</label>
              <input
                value={currency}
                maxLength={3}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {save.isPending ? "Saving…" : "Save preferences"}
            </button>
            <button
              onClick={() => sample.mutate()}
              disabled={sample.isPending}
              className="rounded-md border border-border px-5 py-2 text-sm hover:bg-accent disabled:opacity-50"
            >
              {sample.isPending ? "Building…" : "Send me a sample reel now"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
