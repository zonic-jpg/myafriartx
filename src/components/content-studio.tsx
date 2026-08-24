import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSiteContent, publishSiteContent } from "@/lib/content-studio.functions";

/**
 * Content Studio — visual page editor (admin module).
 * Persists to `app_settings.site_content` via server functions.
 */

const DEVICE_PRESETS = [
  { label: "Mobile", w: 480 },
  { label: "Tablet", w: 1024 },
  { label: "Desktop", w: 1600 },
];
const readFile = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
async function resizeForDevices(file: File) {
  const img = await loadImg(await readFile(file));
  return DEVICE_PRESETS.map(({ label, w }) => {
    const s = Math.min(1, w / img.width);
    const cw = Math.max(1, Math.round(img.width * s));
    const ch = Math.max(1, Math.round(img.height * s));
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    c.getContext("2d")!.drawImage(img, 0, 0, cw, ch);
    const url = c.toDataURL("image/jpeg", 0.82);
    return { label, width: cw, height: ch, url, kb: Math.round((url.length * 0.75) / 1024) };
  });
}

type Blocks = Record<string, string>;
type PageDef = { label: string; blocks: Blocks };
const PAGES: Record<string, PageDef> = {
  home: {
    label: "Home",
    blocks: {
      kicker: "One place. Every move.",
      headline: "Discover, bid, sell and stage — all inside the Art Lounge.",
      sub: "Step through the doors to browse live auctions, buy and sell direct from collectors, or stage any piece on your own wall.",
    },
  },
  studio: {
    label: "Studio",
    blocks: {
      headline: "Stage a room with AI",
      sub: "Point your camera at a wall and drop any piece in at true scale.",
    },
  },
  lounge: {
    label: "Sale Lounge",
    blocks: { headline: "Sale Lounge", sub: "A private floor for registered buyers and sellers." },
  },
};
type Saved = { content: Record<string, Blocks>; media: Record<string, string | null> };
const seed = (): Saved => ({
  content: Object.fromEntries(Object.entries(PAGES).map(([k, v]) => [k, { ...v.blocks }])),
  media: {},
});
const loadLocal = (): Saved => seed();

export function ContentStudio() {
  const fetchContent = useServerFn(getSiteContent);
  const publishFn = useServerFn(publishSiteContent);
  const [page, setPage] = useState("home");
  const [draft, setDraft] = useState<Saved>(seed);
  const [saved, setSaved] = useState<Saved>(seed);
  const [sizes, setSizes] = useState<
    { label: string; width: number; height: number; url: string; kb: number }[] | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent()
      .then((remote) => {
        const s = remote?.content ? (remote as Saved) : loadLocal();
        setDraft(s);
        setSaved(s);
      })
      .catch(() => {
        const s = loadLocal();
        setDraft(s);
        setSaved(s);
      })
      .finally(() => setLoading(false));
  }, []);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const b = draft.content[page] || {};
  const setField = (k: string, v: string) =>
    setDraft((d) => ({ ...d, content: { ...d.content, [page]: { ...d.content[page], [k]: v } } }));
  const onImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const out = await resizeForDevices(f);
      setSizes(out);
      setDraft((d) => ({ ...d, media: { ...d.media, [page]: out[out.length - 1].url } }));
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    setBusy(true);
    try {
      await publishFn({ data: draft });
      setSaved(draft);
      setStatus("Published — saved to app_settings.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  };
  const discard = () => {
    setDraft(saved);
    setSizes(null);
    setStatus("Changes discarded.");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading site content…</p>;

  return (
    <div className="space-y-5">
      <div className="border border-primary/30 bg-primary/5 p-3 text-sm">
        Page editing is the <strong>super-admin-granted</strong> right (the <code>admin</code> role
        on this account). Edits here publish to the live pages.
      </div>
      <div className="flex flex-wrap gap-1 border-b border-border">
        {Object.entries(PAGES).map(([k, v]) => (
          <button
            key={k}
            onClick={() => {
              setPage(k);
              setSizes(null);
            }}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${page === k ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="border border-border bg-card p-4">
            <h4 className="mb-3 font-display text-sm">Text on this page</h4>
            {Object.keys(b).map((k) => (
              <label key={k} className="mb-3 block">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {k}
                </span>
                {b[k].length > 60 ? (
                  <textarea
                    value={b[k]}
                    onChange={(e) => setField(k, e.target.value)}
                    className="mt-1 min-h-20 w-full border border-input bg-background p-2 text-sm"
                  />
                ) : (
                  <input
                    value={b[k]}
                    onChange={(e) => setField(k, e.target.value)}
                    className="mt-1 w-full border border-input bg-background p-2 text-sm"
                  />
                )}
              </label>
            ))}
          </div>
          <div className="border border-border bg-card p-4">
            <h4 className="mb-3 font-display text-sm">Hero media — auto-sized for every device</h4>
            {draft.media[page] ? (
              <div className="space-y-2">
                {sizes && (
                  <div className="flex gap-3">
                    {sizes.map((s) => (
                      <div key={s.label} className="text-center">
                        <img src={s.url} alt="" className="h-14 w-auto border border-border" />
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          {s.label}
                          <br />
                          {s.width}×{s.height} · {s.kb}KB
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    setDraft((d) => ({ ...d, media: { ...d.media, [page]: null } }));
                    setSizes(null);
                  }}
                  className="text-xs text-destructive"
                >
                  Remove image
                </button>
              </div>
            ) : (
              <label className="block text-sm">
                <span className="text-xs text-muted-foreground">
                  {busy
                    ? "Generating Mobile / Tablet / Desktop…"
                    : "Add an image — device sizes are created automatically"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onImg}
                  className="mt-1 block text-sm"
                />
              </label>
            )}
          </div>
        </div>

        <div className="self-start border border-border bg-muted/30">
          <div className="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Live preview · {PAGES[page].label}
          </div>
          <div className="p-5">
            {b.kicker && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                {b.kicker}
              </p>
            )}
            <h3 className="mt-1 font-display text-2xl leading-tight">{b.headline}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{b.sub}</p>
            {draft.media[page] && (
              <img src={draft.media[page]!} alt="" className="mt-3 w-full border border-border" />
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between gap-3 border border-border bg-background p-3">
        <span className="text-sm text-muted-foreground">
          {dirty ? "You have unpublished changes." : status || "All changes published."}
        </span>
        <div className="flex gap-2">
          <button
            onClick={discard}
            disabled={!dirty}
            className="border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Discard
          </button>
          <button
            onClick={publish}
            disabled={!dirty}
            className="bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            Publish changes
          </button>
        </div>
      </div>
    </div>
  );
}
