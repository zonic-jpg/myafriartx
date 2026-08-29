import { ContentStudio } from "@/components/content-studio";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  adminGetAll,
  checkIsAdmin,
  setMockCatalogueEnabled,
  saveArtist,
  deleteArtist,
  saveArtwork,
  deleteArtwork,
  uploadArtworkImage,
  saveStyle,
  deleteStyle,
  setRenderFeatured,
  deleteRender,
  savePane,
  deletePane,
  reorderPanes,
  setPaneStatus,
} from "@/lib/admin.functions";
import {
  getAllocations,
  saveAllocations,
  lookupById,
  listTransactions,
} from "@/lib/catalogue.functions";
import { getPaneViewStats } from "@/lib/pane-views.functions";
import { getEntryClickStats } from "@/lib/entry-clicks.functions";
import { artistDefault, localImageForKey, localPaneImage } from "@/lib/local-image-assets";
import { BrokerageAdmin } from "@/components/admin/brokerage-admin";
import { ServicePricingAdmin } from "@/components/admin/service-pricing-admin";
import { KycAdmin } from "@/components/admin/kyc-admin";
import { DisputesAdmin } from "@/components/admin/disputes-admin";
import { adminListCollateral, adminUpdateCollateral } from "@/lib/collateral.functions";
import { adminGateActive, adminGateEmail, adminGateRole, clearAdminGate } from "@/lib/adminGate";
import { AdminTesterQueue } from "@/components/admin/AdminTesterQueue";
import { LOCAL_MOCK_ARTISTS, LOCAL_MOCK_ARTWORKS } from "@/lib/mock-catalogue";
import { publicPaneAssets } from "@/lib/local-image-assets";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — MyAfriart" }] }),
  component: Admin,
});

const MEDIA = ["oil", "watercolor", "pastel", "sculpture", "photograph", "print", "mixed_media"];

function localGateAdminData() {
  const artists = LOCAL_MOCK_ARTISTS;
  const artworks = LOCAL_MOCK_ARTWORKS;
  const panes = Object.entries(publicPaneAssets).map(([pane_id, image_url], i) => ({
    id: `local-pane-${pane_id}`,
    pane_id,
    kicker: String(pane_id).replace(/_/g, " "),
    title: String(pane_id).replace(/_/g, " "),
    summary: "Soft-session local pane",
    reveal: "",
    subtitle: null,
    body: null,
    cta_label: "Explore",
    cta_href: `/${pane_id === "stage" ? "studio" : pane_id === "piece" ? "" : pane_id}`,
    image_url,
    image_url_mobile: image_url,
    status: "published",
    sort_order: i,
    is_active: true,
  }));
  return {
    artists,
    artworks,
    styles: [],
    renders: [],
    panes,
    settings: { mock_catalogue_enabled: true },
  };
}

function Admin() {
  const navigate = useNavigate();
  // Soft owner/admin gate must survive remounts and auth-null races (AdSpot pattern).
  const [gate, setGate] = useState(() =>
    typeof window !== "undefined" ? adminGateActive() : false,
  );
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    const syncGate = () => setGate(adminGateActive());
    syncGate();
    window.addEventListener("storage", syncGate);
    window.addEventListener("focus", syncGate);
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthed(!!s);
      syncGate();
    });
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      syncGate();
      setReady(true);
    });
    return () => {
      window.removeEventListener("storage", syncGate);
      window.removeEventListener("focus", syncGate);
      sub.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (ready && !authed && !gate) navigate({ to: "/login" });
  }, [ready, authed, gate, navigate]);

  const checkAdmin = useServerFn(checkIsAdmin);
  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ["isAdmin"],
    queryFn: () => checkAdmin(),
    enabled: authed && !gate,
    retry: false,
  });

  // Uniform tester gate grants full admin client-side without a Supabase session.
  if (gate) {
    return <AdminInner gateMode />;
  }

  if (!ready || !authed || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!roleData?.isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="font-display text-3xl">Admin only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account does not have the admin role. Ask an existing admin to grant it via the
          user_roles table.
        </p>
        <Link
          to="/studio"
          className="mt-6 inline-block rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
        >
          Back to Studio
        </Link>
      </div>
    );
  }
  return <AdminInner />;
}

type Tab =
  | "studio"
  | "settings"
  | "artworks"
  | "artists"
  | "styles"
  | "renders"
  | "panes"
  | "media"
  | "allocation"
  | "lookup"
  | "transactions"
  | "analytics"
  | "brokerage"
  | "collateral"
  | "kyc"
  | "disputes"
  | "pricing";

function AdminInner({ gateMode = false }: { gateMode?: boolean }) {
  const qc = useQueryClient();
  const getAll = useServerFn(adminGetAll);
  const { data: serverData, isLoading } = useQuery({
    queryKey: ["admin", "all"],
    queryFn: () => getAll(),
    enabled: !gateMode,
    retry: false,
  });
  const [localData] = useState(() => localGateAdminData());
  const data = gateMode ? localData : serverData;
  const [tab, setTab] = useState<Tab>(gateMode ? "artists" : "artworks");
  const [lookupSeed, setLookupSeed] = useState<string>("");
  const refresh = () => {
    if (gateMode) return;
    qc.invalidateQueries({ queryKey: ["admin", "all"] });
  };

  useEffect(() => {
    if (!gateMode) return;
    if (window.location.hash === "#admintester-queue" || window.location.hash.includes("admintester")) {
      requestAnimationFrame(() =>
        document.getElementById("admintester-queue")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }, [gateMode]);

  const openLookup = (q: string) => {
    setLookupSeed(q);
    setTab("lookup");
  };

  const gateRole = gateMode ? adminGateRole() : null;
  const gateEmail = gateMode ? adminGateEmail() || "admin" : null;
  const isOwner = gateRole === "owner";

  return (
    <div
      className="min-h-screen bg-background"
      id="root"
      data-auth-role={gateMode ? gateRole || "admin" : "supabase-admin"}
      data-gate-mode={gateMode ? "1" : "0"}
    >
      <AdminTesterQueue />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-xl">
            MyAfriart
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/studio" className="text-muted-foreground hover:text-foreground">
              Studio
            </Link>
            <Link to="/blog" className="text-muted-foreground hover:text-foreground">
              Blog
            </Link>
            <span className="font-medium">Admin</span>
            <button
              type="button"
              onClick={() => {
                clearAdminGate();
                void supabase.auth.signOut().catch(() => undefined);
                window.location.href = "/login";
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-3xl">Catalogue admin</h1>
        {gateMode && (
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as <b>{gateEmail}</b>
            {isOwner ? " · Super admin" : " · Admin"} (soft session). Full catalogue tools below —
            clicking tabs never clears this session.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-1 border-b border-border">
          {(
            [
              "studio",
              "settings",
              "artworks",
              "artists",
              "styles",
              "renders",
              "panes",
              "media",
              "allocation",
              "lookup",
              "transactions",
              "analytics",
              "brokerage",
              "collateral",
              "kyc",
              "disputes",
              "pricing",
            ] as Tab[]
          ).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm capitalize ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {!gateMode && isLoading ? (
          <div className="py-10 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="py-6">
            {tab === "studio" && <ContentStudio />}
            {tab === "settings" && data && <SettingsAdmin data={data} onChange={refresh} />}
            {tab === "artworks" && data && (
              <ArtworksAdmin data={data} onChange={refresh} onLookup={openLookup} />
            )}
            {tab === "artists" && data && (
              <ArtistsAdmin data={data} onChange={refresh} onLookup={openLookup} />
            )}
            {tab === "styles" && data && <StylesAdmin data={data} onChange={refresh} />}
            {tab === "renders" && data && <RendersAdmin data={data} onChange={refresh} />}
            {tab === "panes" && data && <PanesAdmin data={data} onChange={refresh} />}
            {tab === "media" && data && <MediaAuditAdmin data={data} />}
            {tab === "allocation" && data && <AllocationAdmin data={data} />}
            {tab === "lookup" && (
              <LookupAdmin seed={lookupSeed} onSeedConsumed={() => setLookupSeed("")} />
            )}
            {tab === "transactions" && <TransactionsAdmin onLookup={openLookup} />}
            {tab === "analytics" && <AnalyticsAdmin />}
            {tab === "brokerage" && <BrokerageAdmin />}
            {tab === "collateral" && <CollateralAdminPanel />}
            {tab === "kyc" && <KycAdmin />}
            {tab === "disputes" && <DisputesAdmin />}
            {tab === "pricing" && <ServicePricingAdmin />}
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- Settings ---------- */
function SettingsAdmin({ data, onChange }: { data: any; onChange: () => void }) {
  const setMock = useServerFn(setMockCatalogueEnabled);
  const enabled = data.settings?.mock_catalogue_enabled !== false;
  const mockArtists = (data.artists ?? []).filter((a: any) => a.content_source === "mock").length;
  const liveArtists = (data.artists ?? []).filter((a: any) => a.content_source !== "mock").length;
  const mockArtworks = (data.artworks ?? []).filter((a: any) => a.content_source === "mock").length;
  const liveArtworks = (data.artworks ?? []).filter((a: any) => a.content_source !== "mock").length;

  const mToggle = useMutation({
    mutationFn: (next: boolean) => setMock({ data: { enabled: next } }),
    onSuccess: (_d, next) => {
      toast.success(next ? "Mock catalogue enabled" : "Live catalogue enabled");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl space-y-4">
      <div className="rounded border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl">Catalogue source</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This controls what the public catalogue and studio pull from.
            </p>
          </div>
          <button
            type="button"
            disabled={mToggle.isPending}
            onClick={() => mToggle.mutate(!enabled)}
            className={`rounded-md px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 ${enabled ? "bg-primary" : "bg-foreground"}`}
          >
            {enabled ? "Using mock catalogue" : "Using live catalogue"}
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div
            className={`rounded border p-4 ${enabled ? "border-primary bg-primary/5" : "border-border bg-background"}`}
          >
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Mock database
            </div>
            <div className="mt-2 font-display text-2xl">
              {mockArtists} profiles · {mockArtworks} works
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Switch this off when real artwork records are ready.
            </p>
          </div>
          <div
            className={`rounded border p-4 ${!enabled ? "border-primary bg-primary/5" : "border-border bg-background"}`}
          >
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Live database
            </div>
            <div className="mt-2 font-display text-2xl">
              {liveArtists} profiles · {liveArtworks} works
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Only live records appear when mock catalogue is off.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Artists ---------- */
function ArtistsAdmin({
  data,
  onChange,
  onLookup,
}: {
  data: any;
  onChange: () => void;
  onLookup?: (q: string) => void;
}) {
  const save = useServerFn(saveArtist);
  const del = useServerFn(deleteArtist);
  const [editing, setEditing] = useState<any | null>(null);

  const mSave = useMutation({
    mutationFn: (v: any) => save({ data: v }),
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mDel = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() =>
            setEditing({
              name: "",
              bio: "",
              era: "",
              country: "",
              alma_mater: "",
              portrait_url: "",
              content_source: "live",
              gender: "",
              domicile_city: "",
              date_of_birth: "",
              short_code: "",
            })
          }
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
        >
          + New artist
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="py-2"></th>
            <th>ID</th>
            <th>Name</th>
            <th>Country</th>
            <th>Era</th>
            <th>Alma mater</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.artists.map((a: any) => (
            <tr key={a.id} className="border-t border-border">
              <td className="py-2 pr-2">
                <img
                  src={a.portrait_url || artistDefault}
                  alt={a.name}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = artistDefault;
                  }}
                  className="h-10 w-10 rounded-md border border-border bg-muted object-contain"
                />
              </td>
              <td className="py-2 font-mono text-xs">
                {onLookup ? (
                  <button
                    onClick={() => onLookup(a.short_code || a.id)}
                    className="text-primary underline"
                  >
                    {a.short_code ?? a.id.slice(0, 8)}
                  </button>
                ) : (
                  (a.short_code ?? a.id.slice(0, 8))
                )}
              </td>
              <td className="py-2">
                {a.name}
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                  {a.content_source ?? "live"}
                </span>
              </td>
              <td className="text-muted-foreground">{a.country ?? "—"}</td>
              <td className="text-muted-foreground">{a.era ?? "—"}</td>
              <td className="text-muted-foreground">{a.alma_mater ?? "—"}</td>
              <td className="text-right">
                <button onClick={() => setEditing(a)} className="mr-2 text-xs underline">
                  Edit
                </button>
                <button
                  onClick={() => confirm("Delete?") && mDel.mutate(a.id)}
                  className="text-xs text-destructive underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Edit artist" : "New artist"}>
          <Field label="Name">
            <input
              className="inp"
              value={editing.name ?? ""}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country of origin">
              <input
                className="inp"
                placeholder="e.g. Nigeria"
                value={editing.country ?? ""}
                onChange={(e) => setEditing({ ...editing, country: e.target.value })}
              />
            </Field>
            <Field label="Era">
              <input
                className="inp"
                value={editing.era ?? ""}
                onChange={(e) => setEditing({ ...editing, era: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gender">
              <input
                className="inp"
                placeholder="e.g. male, female, non-binary"
                value={editing.gender ?? ""}
                onChange={(e) => setEditing({ ...editing, gender: e.target.value })}
              />
            </Field>
            <Field label="Date of birth">
              <input
                className="inp"
                type="date"
                value={editing.date_of_birth ?? ""}
                onChange={(e) => setEditing({ ...editing, date_of_birth: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Domicile city">
              <input
                className="inp"
                placeholder="e.g. Lagos"
                value={editing.domicile_city ?? ""}
                onChange={(e) => setEditing({ ...editing, domicile_city: e.target.value })}
              />
            </Field>
            <Field label="Short code">
              <input
                className="inp"
                placeholder="e.g. ART-000001"
                value={editing.short_code ?? ""}
                onChange={(e) => setEditing({ ...editing, short_code: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Alma mater">
            <input
              className="inp"
              placeholder="e.g. Yaba College of Technology"
              value={editing.alma_mater ?? ""}
              onChange={(e) => setEditing({ ...editing, alma_mater: e.target.value })}
            />
          </Field>
          <Field label="Catalogue source">
            <select
              className="inp"
              value={editing.content_source ?? "live"}
              onChange={(e) => setEditing({ ...editing, content_source: e.target.value })}
            >
              <option value="live">Live database</option>
              <option value="mock">Mock database</option>
            </select>
          </Field>
          <Field label="Portrait URL">
            <input
              className="inp"
              value={editing.portrait_url ?? ""}
              onChange={(e) => setEditing({ ...editing, portrait_url: e.target.value })}
            />
          </Field>
          <Field label="Bio">
            <textarea
              className="inp h-24"
              value={editing.bio ?? ""}
              onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
            />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              className="rounded-md border border-border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              disabled={mSave.isPending}
              onClick={() => mSave.mutate(cleanArtist(editing))}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
const cleanArtist = (a: any) => ({
  id: a.id,
  name: a.name,
  bio: a.bio || null,
  era: a.era || null,
  country: a.country || null,
  alma_mater: a.alma_mater || null,
  portrait_url: a.portrait_url || null,
  content_source: a.content_source === "mock" ? "mock" : "live",
  gender: a.gender || null,
  domicile_city: a.domicile_city || null,
  date_of_birth: a.date_of_birth || null,
  short_code: a.short_code || null,
});

/* ---------- Artworks ---------- */
function ArtworksAdmin({
  data,
  onChange,
  onLookup,
}: {
  data: any;
  onChange: () => void;
  onLookup?: (q: string) => void;
}) {
  const save = useServerFn(saveArtwork);
  const del = useServerFn(deleteArtwork);
  const upload = useServerFn(uploadArtworkImage);
  const [editing, setEditing] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);

  const mSave = useMutation({
    mutationFn: (v: any) => save({ data: v }),
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mDel = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFile(f: File) {
    setUploading(true);
    try {
      const b64: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(r.error);
        r.readAsDataURL(f);
      });
      const { url } = await upload({ data: { base64: b64, filename: f.name } });
      setEditing((e: any) => ({ ...e, image_url: url }));
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() =>
            setEditing({
              title: "",
              medium: "oil",
              image_url: "",
              artist_id: null,
              year: "",
              description: "",
              is_active: true,
              content_source: "live",
              price: null,
              currency: "USD",
              lifecycle_status: "in_catalogue",
            })
          }
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
        >
          + New artwork
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {data.artworks.map((a: any, index: number) => {
          const artist = data.artists.find((x: any) => x.id === a.artist_id);
          return (
            <div key={a.id} className="overflow-hidden rounded border border-border bg-card">
              <img
                src={a.image_url || localImageForKey(a.id || a.title, index)}
                alt={a.title}
                className="aspect-square w-full bg-muted object-contain"
              />
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium">{a.title}</div>
                  {onLookup ? (
                    <button
                      onClick={() => onLookup(a.short_code || a.id)}
                      className="font-mono text-[10px] text-primary underline shrink-0"
                    >
                      {a.short_code ?? a.id.slice(0, 8)}
                    </button>
                  ) : (
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                      {a.short_code ?? a.id.slice(0, 8)}
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {artist?.name ?? "Unknown"} · {a.medium} · {a.lifecycle_status ?? "in_catalogue"}{" "}
                  · views {a.view_count ?? 0}
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <button onClick={() => setEditing(a)} className="underline">
                    Edit
                  </button>
                  <button
                    onClick={() => confirm("Delete?") && mDel.mutate(a.id)}
                    className="text-destructive underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Edit artwork" : "New artwork"}>
          <Field label="Title">
            <input
              className="inp"
              value={editing.title ?? ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Medium">
              <select
                className="inp"
                value={editing.medium}
                onChange={(e) => setEditing({ ...editing, medium: e.target.value })}
              >
                {MEDIA.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Artist">
              <select
                className="inp"
                value={editing.artist_id ?? ""}
                onChange={(e) => setEditing({ ...editing, artist_id: e.target.value || null })}
              >
                <option value="">— none —</option>
                {data.artists.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Year">
              <input
                className="inp"
                value={editing.year ?? ""}
                onChange={(e) => setEditing({ ...editing, year: e.target.value })}
              />
            </Field>
            <Field label="Active">
              <select
                className="inp"
                value={editing.is_active ? "1" : "0"}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.value === "1" })}
              >
                <option value="1">Active</option>
                <option value="0">Hidden</option>
              </select>
            </Field>
            <Field label="Catalogue source">
              <select
                className="inp"
                value={editing.content_source ?? "live"}
                onChange={(e) => setEditing({ ...editing, content_source: e.target.value })}
              >
                <option value="live">Live database</option>
                <option value="mock">Mock database</option>
              </select>
            </Field>
            <Field label="Price">
              <input
                className="inp"
                type="number"
                min={0}
                step="0.01"
                value={editing.price ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    price: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Currency">
              <select
                className="inp"
                value={editing.currency ?? "USD"}
                onChange={(e) => setEditing({ ...editing, currency: e.target.value })}
              >
                <option value="USD">USD</option>
                <option value="NGN">NGN</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="ZAR">ZAR</option>
                <option value="KES">KES</option>
                <option value="GHS">GHS</option>
              </select>
            </Field>
            <Field label="Lifecycle status">
              <select
                className="inp"
                value={editing.lifecycle_status ?? "in_catalogue"}
                onChange={(e) => setEditing({ ...editing, lifecycle_status: e.target.value })}
              >
                <option value="in_catalogue">In catalogue</option>
                <option value="sold">Sold</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </Field>
          </div>
          <Field label="Image">
            <div className="space-y-2">
              <img
                src={editing.image_url || localImageForKey(editing.id || editing.title)}
                alt=""
                className="h-32 w-32 rounded bg-muted object-contain"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
              {uploading && <div className="text-xs text-muted-foreground">Uploading…</div>}
              <input
                className="inp"
                placeholder="…or paste an image URL"
                value={editing.image_url ?? ""}
                onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
              />
            </div>
          </Field>
          <Field label="Description">
            <textarea
              className="inp h-20"
              value={editing.description ?? ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              className="rounded-md border border-border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              disabled={mSave.isPending}
              onClick={() => mSave.mutate(cleanArtwork(editing))}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
const cleanArtwork = (a: any) => ({
  id: a.id,
  title: a.title,
  medium: a.medium,
  image_url: a.image_url,
  artist_id: a.artist_id || null,
  year: a.year || null,
  description: a.description || null,
  is_active: !!a.is_active,
  content_source: a.content_source === "mock" ? "mock" : "live",
  price: a.price === "" || a.price === undefined ? null : a.price === null ? null : Number(a.price),
  currency: (a.currency || "USD").toUpperCase(),
  lifecycle_status: a.lifecycle_status || "in_catalogue",
});

/* ---------- Styles ---------- */
function StylesAdmin({ data, onChange }: { data: any; onChange: () => void }) {
  const save = useServerFn(saveStyle);
  const del = useServerFn(deleteStyle);
  const [editing, setEditing] = useState<any | null>(null);

  const mSave = useMutation({
    mutationFn: (v: any) => save({ data: v }),
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mDel = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() =>
            setEditing({
              slug: "",
              name: "",
              description: "",
              prompt_fragment: "",
              sort_order: 0,
              is_active: true,
            })
          }
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
        >
          + New style
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="py-2">Name</th>
            <th>Slug</th>
            <th>Order</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.styles.map((s: any) => (
            <tr key={s.id} className="border-t border-border">
              <td className="py-2">
                {s.name}
                {!s.is_active && (
                  <span className="ml-2 text-xs text-muted-foreground">(hidden)</span>
                )}
              </td>
              <td className="text-muted-foreground">{s.slug}</td>
              <td className="text-muted-foreground">{s.sort_order}</td>
              <td className="text-right">
                <button onClick={() => setEditing(s)} className="mr-2 text-xs underline">
                  Edit
                </button>
                <button
                  onClick={() => confirm("Delete?") && mDel.mutate(s.id)}
                  className="text-xs text-destructive underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Edit style" : "New style"}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input
                className="inp"
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <Field label="Slug">
              <input
                className="inp"
                value={editing.slug ?? ""}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              />
            </Field>
            <Field label="Sort order">
              <input
                type="number"
                className="inp"
                value={editing.sort_order ?? 0}
                onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })}
              />
            </Field>
            <Field label="Active">
              <select
                className="inp"
                value={editing.is_active ? "1" : "0"}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.value === "1" })}
              >
                <option value="1">Active</option>
                <option value="0">Hidden</option>
              </select>
            </Field>
          </div>
          <Field label="Description">
            <input
              className="inp"
              value={editing.description ?? ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
          </Field>
          <Field label="Prompt fragment">
            <textarea
              className="inp h-28"
              value={editing.prompt_fragment ?? ""}
              onChange={(e) => setEditing({ ...editing, prompt_fragment: e.target.value })}
            />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              className="rounded-md border border-border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              disabled={mSave.isPending}
              onClick={() => mSave.mutate(cleanStyle(editing))}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
const cleanStyle = (s: any) => ({
  id: s.id,
  slug: s.slug,
  name: s.name,
  description: s.description || null,
  prompt_fragment: s.prompt_fragment,
  sort_order: Number(s.sort_order) || 0,
  is_active: !!s.is_active,
});

/* ---------- Renders ---------- */
function RendersAdmin({ data, onChange }: { data: any; onChange: () => void }) {
  const featureFn = useServerFn(setRenderFeatured);
  const delFn = useServerFn(deleteRender);
  const [filter, setFilter] = useState<"all" | "featured" | "completed" | "failed">("all");

  const mFeat = useMutation({
    mutationFn: (v: { id: string; is_featured: boolean }) => featureFn({ data: v }),
    onSuccess: () => {
      toast.success("Updated");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mDel = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renders: any[] = (data.renders ?? []).filter((r: any) => {
    if (filter === "featured") return r.is_featured;
    if (filter === "completed") return r.status === "completed";
    if (filter === "failed") return r.status === "failed";
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1">
          {(["all", "featured", "completed", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md border px-3 py-1 text-xs capitalize ${filter === f ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          {renders.length} render{renders.length === 1 ? "" : "s"}
        </div>
      </div>

      {renders.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No renders match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {renders.map((r) => (
            <div key={r.id} className="overflow-hidden rounded border border-border bg-card">
              <div className="relative aspect-[4/3] bg-muted">
                {r.result_image_url ? (
                  <img src={r.result_image_url} alt="" className="h-full w-full object-contain" />
                ) : (
                  <img
                    src={localImageForKey(r.id)}
                    alt=""
                    className="h-full w-full object-contain opacity-60"
                  />
                )}
                <div className="absolute left-2 top-2 flex gap-1">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                      r.status === "completed"
                        ? "bg-primary text-primary-foreground"
                        : r.status === "failed"
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {r.status}
                  </span>
                  {r.is_featured && (
                    <span className="rounded bg-foreground px-2 py-0.5 text-[10px] uppercase tracking-wider text-background">
                      Featured
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2 p-3 text-xs">
                <div className="text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </div>
                <div className="truncate text-muted-foreground" title={r.user_id}>
                  user {r.user_id.slice(0, 8)}…
                </div>
                {r.error_message && <div className="text-destructive">{r.error_message}</div>}
                <div className="flex items-center justify-between pt-1">
                  <button
                    disabled={r.status !== "completed" || mFeat.isPending}
                    onClick={() => mFeat.mutate({ id: r.id, is_featured: !r.is_featured })}
                    className="underline disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {r.is_featured ? "Unfeature" : "Feature"}
                  </button>
                  {r.result_image_url && (
                    <a
                      href={r.result_image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Open
                    </a>
                  )}
                  <button
                    onClick={() => confirm("Delete this render?") && mDel.mutate(r.id)}
                    className="text-destructive underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Media audit ---------- */
function MediaAuditAdmin({ data }: { data: any }) {
  const rows = [
    ...(data.panes ?? []).map((p: any) => ({
      kind: "pane",
      id: p.pane_id || p.id,
      label: p.title || p.pane_id || p.id,
      url: p.image_url || localPaneImage(p.pane_id),
      mobile: p.image_url_mobile || null,
    })),
    ...(data.artworks ?? []).slice(0, 80).map((a: any) => ({
      kind: "artwork",
      id: a.short_code || a.id,
      label: a.title || a.id,
      url: a.image_url || localImageForKey(a.id || a.title),
      mobile: null,
    })),
    ...(data.artists ?? []).slice(0, 40).map((a: any) => ({
      kind: "artist",
      id: a.short_code || a.id,
      label: a.name || a.id,
      url: a.portrait_url || artistDefault,
      mobile: null,
    })),
  ];

  const [status, setStatus] = useState<Record<string, "ok" | "broken" | "checking">>({});

  useEffect(() => {
    let cancelled = false;
    const next: Record<string, "ok" | "broken" | "checking"> = {};
    rows.forEach((r) => {
      next[`${r.kind}:${r.id}`] = "checking";
    });
    setStatus(next);
    rows.forEach((r) => {
      const key = `${r.kind}:${r.id}`;
      const img = new Image();
      img.onload = () => {
        if (!cancelled) setStatus((s) => ({ ...s, [key]: img.naturalWidth > 0 ? "ok" : "broken" }));
      };
      img.onerror = () => {
        if (!cancelled) setStatus((s) => ({ ...s, [key]: "broken" }));
      };
      img.src = r.url;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const broken = rows.filter((r) => status[`${r.kind}:${r.id}`] === "broken");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Media audit</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Checks pane, artwork, and artist image URLs. Broken assets should be replaced via Panes /
          Artworks tabs. Soft-session owners can review without a Supabase JWT.
        </p>
        <p className="mt-2 text-sm">
          {rows.length} assets ·{" "}
          <span className={broken.length ? "text-destructive" : "text-emerald-700"}>
            {broken.length} broken
          </span>
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const key = `${r.kind}:${r.id}`;
          const st = status[key] || "checking";
          return (
            <div key={key} className="overflow-hidden rounded-md border border-border bg-card">
              <div className="aspect-[4/3] bg-muted">
                <img src={r.url} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="space-y-1 p-3 text-xs">
                <div className="font-medium text-foreground">{r.label}</div>
                <div className="text-muted-foreground">
                  {r.kind} · {r.id}
                </div>
                <div
                  className={
                    st === "ok"
                      ? "text-emerald-700"
                      : st === "broken"
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }
                >
                  {st === "ok" ? "OK" : st === "broken" ? "Broken / missing" : "Checking…"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Landing Panes ---------- */
function PanesAdmin({ data, onChange }: { data: any; onChange: () => void }) {
  const save = useServerFn(savePane);
  const del = useServerFn(deletePane);
  const reorder = useServerFn(reorderPanes);
  const setStatus = useServerFn(setPaneStatus);
  const upload = useServerFn(uploadArtworkImage);
  const statsFn = useServerFn(getPaneViewStats);
  const { data: viewStats } = useQuery({
    queryKey: ["pane-view-stats"],
    queryFn: () => statsFn(),
    staleTime: 60_000,
  });
  const [editing, setEditing] = useState<any | null>(null);
  const [uploading, setUploading] = useState<null | "desktop" | "mobile">(null);
  const [localPanes, setLocalPanes] = useState<any[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");

  const serverPanes: any[] = data.panes ?? [];
  useEffect(() => {
    if (!dirty) setLocalPanes(serverPanes);
  }, [serverPanes, dirty]);
  const allPanes = localPanes ?? serverPanes;
  const panes =
    statusFilter === "all"
      ? allPanes
      : allPanes.filter((p) => (p.status ?? "draft") === statusFilter);

  const mSave = useMutation({
    mutationFn: (v: any) => save({ data: v }),
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mDel = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mReorder = useMutation({
    mutationFn: (order: { id: string; sort_order: number }[]) => reorder({ data: { order } }),
    onSuccess: () => {
      toast.success("Order saved");
      setDirty(false);
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mStatus = useMutation({
    mutationFn: (v: { id: string; status: "draft" | "published" }) => setStatus({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.status === "published" ? "Published" : "Moved to draft");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFile(f: File, target: "desktop" | "mobile") {
    setUploading(target);
    try {
      const b64: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(r.error);
        r.readAsDataURL(f);
      });
      const { url } = await upload({ data: { base64: b64, filename: f.name } });
      const key = target === "desktop" ? "image_url" : "image_url_mobile";
      setEditing((e: any) => ({ ...e, [key]: url }));
      toast.success(`${target === "desktop" ? "Desktop" : "Mobile"} image uploaded`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(null);
    }
  }

  function moveTo(fromId: string, toId: string) {
    if (fromId === toId) return;
    const list = [...allPanes];
    const fromIdx = list.findIndex((p) => p.id === fromId);
    const toIdx = list.findIndex((p) => p.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    setLocalPanes(list.map((p, i) => ({ ...p, sort_order: i })));
    setDirty(true);
  }

  function saveOrder() {
    const order = allPanes.map((p, i) => ({ id: p.id, sort_order: i }));
    mReorder.mutate(order);
  }

  const canDrag = statusFilter === "all" && !mReorder.isPending;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {(["all", "published", "draft"] as const).map((f) => {
              const count =
                f === "all"
                  ? allPanes.length
                  : allPanes.filter((p) => (p.status ?? "draft") === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`rounded-md border px-3 py-1 text-xs capitalize ${statusFilter === f ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {f} ({count})
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {canDrag ? "Drag ⋮⋮ to reorder." : "Show all panes to reorder."}
          </p>
        </div>
        <div className="flex gap-2">
          {dirty && (
            <>
              <button
                onClick={() => {
                  setLocalPanes(serverPanes);
                  setDirty(false);
                }}
                className="rounded-md border border-border px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                disabled={mReorder.isPending}
                onClick={saveOrder}
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                {mReorder.isPending ? "Saving…" : "Save order"}
              </button>
            </>
          )}
          <button
            onClick={() =>
              setEditing({
                pane_id: "",
                kicker: "",
                title: "",
                summary: "",
                reveal: "",
                image_url: "",
                image_url_mobile: "",
                sort_order: allPanes.length,
                is_active: true,
                status: "draft",
              })
            }
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
          >
            + New pane
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {panes.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No panes match this filter.
          </div>
        )}
        {panes.map((p, idx) => {
          const status = (p.status ?? "draft") as "draft" | "published";
          return (
            <div
              key={p.id}
              draggable={canDrag}
              onDragStart={() => canDrag && setDragId(p.id)}
              onDragOver={(e) => {
                if (canDrag) {
                  e.preventDefault();
                  if (dragId && dragId !== p.id) moveTo(dragId, p.id);
                }
              }}
              onDragEnd={() => setDragId(null)}
              className={`flex items-center gap-3 rounded border bg-card p-2 transition ${dragId === p.id ? "border-primary opacity-60" : "border-border"}`}
            >
              <div
                className={`select-none px-2 text-lg ${canDrag ? "cursor-grab text-muted-foreground" : "cursor-not-allowed text-muted-foreground/30"}`}
                title={canDrag ? "Drag to reorder" : "Switch to All to reorder"}
              >
                ⋮⋮
              </div>
              <div className="w-8 text-center text-xs text-muted-foreground">
                {statusFilter === "all" ? idx + 1 : ""}
              </div>
              <img
                src={p.image_url || localPaneImage(p.pane_id)}
                alt={p.title}
                className="h-12 w-20 flex-shrink-0 rounded bg-muted object-contain"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {p.kicker}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
                      status === "published"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {status}
                  </span>
                  {!p.is_active && (
                    <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-destructive">
                      hidden
                    </span>
                  )}
                </div>
                <div className="truncate text-sm font-medium">{p.title}</div>
                <div className="truncate text-xs text-muted-foreground">#{p.pane_id}</div>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1 text-xs sm:flex-row sm:items-center sm:gap-3">
                <div
                  className="flex flex-col items-end leading-tight text-muted-foreground"
                  title="Views (last 30 days / all time)"
                >
                  <span className="font-mono text-sm text-foreground">
                    {viewStats?.last30?.[p.pane_id] ?? 0}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider">
                    30d · {viewStats?.all?.[p.pane_id] ?? 0} all
                  </span>
                </div>
                {status === "published" ? (
                  <button
                    disabled={mStatus.isPending}
                    onClick={() => mStatus.mutate({ id: p.id, status: "draft" })}
                    className="text-muted-foreground underline disabled:opacity-50"
                  >
                    Unpublish
                  </button>
                ) : (
                  <button
                    disabled={mStatus.isPending}
                    onClick={() => mStatus.mutate({ id: p.id, status: "published" })}
                    className="font-medium text-primary underline disabled:opacity-50"
                  >
                    Publish
                  </button>
                )}
                <button onClick={() => setEditing(p)} className="underline">
                  Edit
                </button>
                <button
                  onClick={() => confirm("Delete?") && mDel.mutate(p.id)}
                  className="text-destructive underline"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Edit pane" : "New pane"}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pane ID (slug)">
              <input
                className="inp"
                placeholder="artist"
                value={editing.pane_id ?? ""}
                onChange={(e) => setEditing({ ...editing, pane_id: e.target.value })}
              />
            </Field>
            <Field label="Sort order">
              <input
                type="number"
                className="inp"
                value={editing.sort_order ?? 0}
                onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })}
              />
            </Field>
          </div>
          <Field label="Kicker">
            <input
              className="inp"
              value={editing.kicker ?? ""}
              onChange={(e) => setEditing({ ...editing, kicker: e.target.value })}
            />
          </Field>
          <Field label="Title">
            <input
              className="inp"
              value={editing.title ?? ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
          </Field>
          <Field label="Summary">
            <textarea
              className="inp h-20"
              value={editing.summary ?? ""}
              onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
            />
          </Field>
          <Field label="Reveal text">
            <textarea
              className="inp h-20"
              value={editing.reveal ?? ""}
              onChange={(e) => setEditing({ ...editing, reveal: e.target.value })}
            />
          </Field>
          <p className="mb-2 text-xs text-muted-foreground">
            Published pane images appear on the landing carousel. Leave blank to use the built-in
            /media defaults so the public site never shows a broken hero.
          </p>
          <Field label="Desktop image (wide)">
            <div className="space-y-2">
              <img
                src={editing.image_url || localPaneImage(editing.pane_id)}
                alt=""
                className="h-32 w-full rounded bg-muted object-contain"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0], "desktop")}
              />
              {uploading === "desktop" && (
                <div className="text-xs text-muted-foreground">Uploading…</div>
              )}
              <input
                className="inp"
                placeholder="…or paste a desktop image URL"
                value={editing.image_url ?? ""}
                onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
              />
            </div>
          </Field>
          <Field label="Mobile image (portrait, optional — falls back to desktop)">
            <div className="space-y-2">
              <img
                src={
                  editing.image_url_mobile || editing.image_url || localPaneImage(editing.pane_id)
                }
                alt=""
                className="h-40 w-24 rounded bg-muted object-contain"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0], "mobile")}
              />
              {uploading === "mobile" && (
                <div className="text-xs text-muted-foreground">Uploading…</div>
              )}
              <input
                className="inp"
                placeholder="…or paste a mobile image URL"
                value={editing.image_url_mobile ?? ""}
                onChange={(e) => setEditing({ ...editing, image_url_mobile: e.target.value })}
              />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select
                className="inp"
                value={editing.status ?? "draft"}
                onChange={(e) => setEditing({ ...editing, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </Field>
            <Field label="Active">
              <select
                className="inp"
                value={editing.is_active ? "1" : "0"}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.value === "1" })}
              >
                <option value="1">Active</option>
                <option value="0">Hidden</option>
              </select>
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              className="rounded-md border border-border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              disabled={mSave.isPending}
              onClick={() => mSave.mutate(cleanPane(editing))}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
const cleanPane = (p: any) => ({
  id: p.id,
  pane_id: p.pane_id,
  kicker: p.kicker,
  title: p.title,
  summary: p.summary,
  reveal: p.reveal || "",
  image_url: p.image_url || null,
  image_url_mobile: p.image_url_mobile || null,
  sort_order: Number(p.sort_order) || 0,
  is_active: !!p.is_active,
  status: (p.status === "published" ? "published" : "draft") as "draft" | "published",
});

/* ---------- Analytics ---------- */
function AnalyticsAdmin() {
  const fetchStats = useServerFn(getEntryClickStats);
  const { data, isLoading } = useQuery({
    queryKey: ["entry-click-stats"],
    queryFn: () => fetchStats(),
    staleTime: 30_000,
  });

  if (isLoading)
    return <div className="py-10 text-sm text-muted-foreground">Loading analytics…</div>;

  const allKeys = Object.keys(data?.all ?? {});
  const recentKeys = Object.keys(data?.last30 ?? {});
  const keys = Array.from(new Set([...allKeys, ...recentKeys])).sort();

  const totalAll = Object.values(data?.all ?? {}).reduce((s: number, n: number) => s + n, 0);
  const total30 = Object.values(data?.last30 ?? {}).reduce((s: number, n: number) => s + n, 0);

  const stageAll = (data?.all ?? {})["stage_virtually::lounge_header"] ?? 0;
  const stage30 = (data?.last30 ?? {})["stage_virtually::lounge_header"] ?? 0;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Total clicks (all time)
          </div>
          <div className="mt-1 font-display text-3xl">{totalAll}</div>
        </div>
        <div className="rounded border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Total clicks (last 30 days)
          </div>
          <div className="mt-1 font-display text-3xl">{total30}</div>
        </div>
        <div className="rounded border border-primary/30 bg-primary/5 p-4">
          <div className="text-xs uppercase tracking-wider text-primary">
            Stage virtually → clicks (30d)
          </div>
          <div className="mt-1 font-display text-3xl text-primary">{stage30}</div>
          <div className="mt-1 text-xs text-muted-foreground">{stageAll} all time</div>
        </div>
      </div>

      {/* Detail table */}
      <div>
        <h3 className="mb-3 font-display text-lg">Entry point breakdown</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2">Entry point</th>
              <th className="py-2">Location</th>
              <th className="py-2 text-right">All time</th>
              <th className="py-2 text-right">Last 30 days</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted-foreground">
                  No clicks recorded yet.
                </td>
              </tr>
            )}
            {keys.map((key) => {
              const [entryPoint, location] = key.split("::");
              const allVal = (data?.all ?? {})[key] ?? 0;
              const recentVal = (data?.last30 ?? {})[key] ?? 0;
              return (
                <tr key={key} className="border-t border-border">
                  <td className="py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${entryPoint === "stage_virtually" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      {entryPoint}
                    </span>
                  </td>
                  <td className="py-2 text-muted-foreground">{location}</td>
                  <td className="py-2 text-right font-mono">{allVal}</td>
                  <td className="py-2 text-right font-mono">{recentVal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Catalogue Allocation ---------- */
function AllocationAdmin({ data }: { data: any }) {
  const [scope, setScope] = useState<"pieces" | "artists">("pieces");
  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-md border border-border p-1 w-fit">
        {(["pieces", "artists"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`rounded px-3 py-1 text-xs uppercase tracking-wider ${scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <AllocationEditor key={scope} scope={scope} data={data} />
    </div>
  );
}

function AllocationEditor({ scope, data }: { scope: "pieces" | "artists"; data: any }) {
  const qc = useQueryClient();
  const get = useServerFn(getAllocations);
  const save = useServerFn(saveAllocations);
  const { data: alloc, isLoading } = useQuery({
    queryKey: ["alloc", scope],
    queryFn: () => get({ data: { scope } }),
  });
  const [rows, setRows] = useState<{ country: string; percent: number }[]>([]);
  useEffect(() => {
    if (alloc?.rows)
      setRows(alloc.rows.map((r: any) => ({ country: r.country, percent: Number(r.percent) })));
  }, [alloc]);

  const availableCountries: string[] = Array.from(
    new Set(
      (data?.artists ?? [])
        .map((a: any) => a.country)
        .filter((c: any) => typeof c === "string" && c.length > 0),
    ),
  ).sort() as string[];

  const total = rows.reduce((s, r) => s + (Number.isFinite(r.percent) ? r.percent : 0), 0);
  const canSave = rows.length === 0 || Math.round(total) === 100;

  const mSave = useMutation({
    mutationFn: () => save({ data: { scope, rows } }),
    onSuccess: () => {
      toast.success("Allocation saved");
      qc.invalidateQueries({ queryKey: ["alloc", scope] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Save failed"),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Distribute the landing catalogue across countries. Percentages must add up to 100. The
        catalogue is capped at 40 {scope}; each country's share of those 40 follows its percent
        here.
      </p>
      <div className="rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Percent</th>
              <th className="px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-3 py-2">
                  <select
                    className="inp"
                    value={r.country}
                    onChange={(e) =>
                      setRows(
                        rows.map((x, idx) => (idx === i ? { ...x, country: e.target.value } : x)),
                      )
                    }
                  >
                    <option value="">— pick —</option>
                    {availableCountries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    className="inp w-28"
                    value={r.percent}
                    onChange={(e) =>
                      setRows(
                        rows.map((x, idx) =>
                          idx === i ? { ...x, percent: Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                    className="text-xs text-destructive underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <style>{`.inp{width:100%;border:1px solid var(--border);background:var(--background);color:var(--foreground);padding:0.4rem 0.5rem;border-radius:0.375rem;font-size:0.875rem;outline:none}.inp:focus{border-color:var(--primary)}`}</style>
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <button
            onClick={() => setRows([...rows, { country: "", percent: 0 }])}
            className="text-xs underline"
          >
            + Add country
          </button>
          <div
            className={`text-sm tabular-nums ${Math.round(total) === 100 ? "text-foreground" : "text-destructive"}`}
          >
            Total: {total.toFixed(0)}%
          </div>
        </div>
      </div>
      <button
        disabled={!canSave || mSave.isPending}
        onClick={() => mSave.mutate()}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {mSave.isPending ? "Saving…" : "Save allocation"}
      </button>
    </div>
  );
}

/* ---------- Lookup ---------- */
function LookupAdmin({ seed, onSeedConsumed }: { seed: string; onSeedConsumed: () => void }) {
  const lookup = useServerFn(lookupById);
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  useEffect(() => {
    if (seed) {
      setQ(seed);
      setSubmitted(seed);
      onSeedConsumed();
    }
  }, [seed, onSeedConsumed]);

  const { data: result, isFetching } = useQuery({
    queryKey: ["lookup", submitted],
    queryFn: () => lookup({ data: { query: submitted } }),
    enabled: submitted.length > 0,
  });

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q.trim());
        }}
        className="flex gap-2"
      >
        <input
          className="inp flex-1"
          placeholder="Paste UUID or short code (ART-…, PCE-…, TXN-…)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          Look up
        </button>
        <style>{`.inp{border:1px solid var(--border);background:var(--background);color:var(--foreground);padding:0.5rem 0.625rem;border-radius:0.375rem;font-size:0.875rem;outline:none}.inp:focus{border-color:var(--primary)}`}</style>
      </form>
      {isFetching && <div className="text-sm text-muted-foreground">Searching…</div>}
      {submitted && !isFetching && result && (
        <div className="rounded-md border border-border bg-card p-4">
          {result.kind === "not_found" && (
            <div className="text-sm text-muted-foreground">No match for "{submitted}".</div>
          )}
          {result.kind === "artist" && <ArtistResult payload={result.payload} />}
          {result.kind === "piece" && <PieceResult payload={result.payload} />}
          {result.kind === "transaction" && <TxnResult payload={result.payload} />}
        </div>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-1.5 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono text-right break-all">{v ?? "—"}</span>
    </div>
  );
}
function ArtistResult({ payload }: { payload: any }) {
  if (!payload?.artist)
    return <div className="text-sm text-muted-foreground">Artist not found.</div>;
  const a = payload.artist;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg">{a.name}</h3>
        <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase">Artist</span>
      </div>
      <KV k="Short code" v={a.short_code} />
      <KV k="UUID" v={a.id} />
      <KV k="Country" v={a.country} />
      <KV k="Domicile" v={a.domicile_city} />
      <KV k="DOB" v={a.date_of_birth} />
      <KV k="Alma mater" v={a.alma_mater} />
      <KV k="Views" v={a.view_count} />
      <KV k="Created" v={a.created_at} />
      <div className="mt-4">
        <h4 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
          Works ({payload.works.length})
        </h4>
        <ul className="space-y-1 text-sm">
          {payload.works.map((w: any) => (
            <li key={w.id} className="flex justify-between gap-2 border-t border-border/50 py-1">
              <span className="font-mono text-xs">{w.short_code}</span>
              <span className="flex-1 truncate">{w.title}</span>
              <span className="text-xs text-muted-foreground">{w.lifecycle_status}</span>
              <span className="text-xs text-muted-foreground">{w.view_count} views</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
function PieceResult({ payload }: { payload: any }) {
  if (!payload) return <div className="text-sm text-muted-foreground">Piece not found.</div>;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg">{payload.title}</h3>
        <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase">Piece</span>
      </div>
      <KV k="Short code" v={payload.short_code} />
      <KV k="UUID" v={payload.id} />
      <KV k="Status" v={payload.lifecycle_status} />
      <KV k="Price" v={payload.price ? `${payload.price} ${payload.currency}` : "—"} />
      <KV k="Medium" v={payload.medium} />
      <KV k="Year" v={payload.year} />
      <KV
        k="Artist"
        v={payload.artist ? `${payload.artist.name} (${payload.artist.short_code})` : "—"}
      />
      <KV k="Views" v={payload.view_count} />
      <KV k="Date loaded" v={payload.created_at} />
      <KV k="Last updated" v={payload.updated_at} />
    </div>
  );
}
function TxnResult({ payload }: { payload: any }) {
  if (!payload) return <div className="text-sm text-muted-foreground">Transaction not found.</div>;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg">Transaction</h3>
        <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase">Txn</span>
      </div>
      {Object.entries(payload).map(([k, v]) => (
        <KV key={k} k={k} v={typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")} />
      ))}
    </div>
  );
}

/* ---------- Transactions list ---------- */
function TransactionsAdmin({ onLookup }: { onLookup: (q: string) => void }) {
  const list = useServerFn(listTransactions);
  const { data, isLoading } = useQuery({ queryKey: ["txns"], queryFn: () => list() });
  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const rows = data?.rows ?? [];
  if (!rows.length)
    return <div className="text-sm text-muted-foreground">No transactions yet.</div>;
  const cols = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, i: number) => (
            <tr key={r.id ?? i} className="border-t border-border">
              {cols.map((c) => (
                <td key={c} className="px-3 py-2 align-top">
                  {(c === "short_code" || c === "id") && r[c] ? (
                    <button
                      onClick={() => onLookup(r[c])}
                      className="font-mono text-xs text-primary underline"
                    >
                      {r[c]}
                    </button>
                  ) : (
                    <span className="font-mono text-xs">
                      {r[c] === null || r[c] === undefined
                        ? "—"
                        : String(typeof r[c] === "object" ? JSON.stringify(r[c]) : r[c])}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- shared ---------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-y-auto rounded-md border border-border bg-card p-6 shadow-xl"
        style={{ maxHeight: "90vh" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        <style>{`.inp{width:100%;border:1px solid var(--border);background:var(--background);color:var(--foreground);padding:0.5rem 0.625rem;border-radius:0.375rem;font-size:0.875rem;outline:none}.inp:focus{border-color:var(--primary)}`}</style>
        {children}
      </div>
    </div>
  );
}

function CollateralAdminPanel() {
  const listFn = useServerFn(adminListCollateral);
  const updateFn = useServerFn(adminUpdateCollateral);
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "collateral"],
    queryFn: () => listFn(),
  });
  const [certUrl, setCertUrl] = useState<Record<string, string>>({});

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      {(rows as Record<string, unknown>[]).map((r) => (
        <div key={String(r.id)} className="rounded-lg border p-4 text-sm">
          <p className="font-medium">{String(r.title)}</p>
          <p className="text-muted-foreground">
            Loan ₦{Number(r.loan_amount_ngn).toLocaleString()} · {String(r.status)}
          </p>
          <input
            className="mt-2 w-full rounded border px-2 py-1 text-xs"
            placeholder="Certificate URL"
            value={certUrl[String(r.id)] ?? ""}
            onChange={(e) => setCertUrl((c) => ({ ...c, [String(r.id)]: e.target.value }))}
          />
          <div className="mt-2 flex gap-2">
            {(["authenticated", "active", "released", "rejected"] as const).map((s) => (
              <button
                key={s}
                type="button"
                className="rounded border px-2 py-1 text-xs capitalize"
                onClick={() =>
                  updateFn({
                    data: {
                      id: String(r.id),
                      status: s,
                      certificateUrl: certUrl[String(r.id)] || null,
                    },
                  }).then(() => qc.invalidateQueries({ queryKey: ["admin", "collateral"] }))
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No collateral pledges.</p>}
    </div>
  );
}
