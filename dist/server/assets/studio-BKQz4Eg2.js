import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { Link, useNavigate } from "@tanstack/react-router";
import { u as useServerFn, l as listMyReels } from "./router-9tDYEkuI.js";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo } from "react";
import { s as supabase } from "./client-BWo_yy_6.js";
import { g as getCatalog, a as getLatestRender } from "./studio-catalog.functions-CC71VM2Z.js";
import { c as createSsrRpc } from "./createSsrRpc-Def-olcZ.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
import { toast } from "sonner";
import { l as localImageForKey } from "./local-image-assets-D5XLRts7.js";
import "@tanstack/zod-adapter";
import "ai";
import "@ai-sdk/openai-compatible";
import "node:crypto";
import "jose";
import "./client.server-D5ro3rAQ.js";
import "@supabase/supabase-js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
const MAX_BASE64_IMAGE_CHARS = 1e7;
const Input = z.object({
  sourceImageBase64: z.string().min(100).max(MAX_BASE64_IMAGE_CHARS),
  // data URL or base64
  artworkIds: z.array(z.string().uuid()).min(1).max(3),
  styleId: z.string().uuid(),
  mediaFilter: z.array(z.string()).max(8).default([]),
  placementRequest: z.string().max(500).optional().default("")
});
const stageRoom = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => Input.parse(d)).handler(createSsrRpc("f71b3d0bcb7aa6cc9486787c008ce585fdf38c0fd64ec2b32a63ce930847f435"));
function NotifyBell() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    supabase.auth.getSession().then(({ data: data2 }) => setAuthed(!!data2.session));
    return () => sub.subscription.unsubscribe();
  }, []);
  const list = useServerFn(listMyReels);
  const { data } = useQuery({
    queryKey: ["notify", "reels", "bell"],
    queryFn: () => list(),
    enabled: authed,
    refetchInterval: 6e4
  });
  if (!authed) return null;
  const unread = data?.unread ?? 0;
  return /* @__PURE__ */ jsxs(
    Link,
    {
      to: "/notify/inbox",
      className: "relative text-muted-foreground hover:text-foreground",
      title: "NotifyMe inbox",
      children: [
        /* @__PURE__ */ jsx("span", { "aria-hidden": true, children: "🔔" }),
        unread > 0 && /* @__PURE__ */ jsx("span", { className: "absolute -right-2 -top-2 min-w-[18px] rounded-full bg-primary px-1 text-[10px] font-medium leading-[18px] text-primary-foreground text-center", children: unread > 9 ? "9+" : unread })
      ]
    }
  );
}
const MEDIA = [{
  v: "oil",
  l: "Oil paintings"
}, {
  v: "watercolor",
  l: "Watercolour"
}, {
  v: "pastel",
  l: "Pastels"
}, {
  v: "sculpture",
  l: "Sculpture"
}, {
  v: "photograph",
  l: "Photography"
}, {
  v: "print",
  l: "Prints"
}, {
  v: "mixed_media",
  l: "Mixed media"
}];
function Studio() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    const {
      data: sub
    } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    supabase.auth.getSession().then(({
      data
    }) => {
      setAuthed(!!data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (ready && !authed) navigate({
      to: "/login"
    });
  }, [ready, authed, navigate]);
  if (!ready || !authed) {
    return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center text-muted-foreground", children: "Loading studio…" });
  }
  return /* @__PURE__ */ jsx(StudioInner, {});
}
function StudioInner() {
  const fetchCatalog = useServerFn(getCatalog);
  const runStage = useServerFn(stageRoom);
  const fetchLatest = useServerFn(getLatestRender);
  const {
    data,
    isLoading
  } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => fetchCatalog()
  });
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data: roles
      } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (active) setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    })();
    return () => {
      active = false;
    };
  }, []);
  const [photo, setPhoto] = useState(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("studio:photo");
  });
  const [media, setMedia] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(sessionStorage.getItem("studio:media") || "[]");
    } catch {
      return [];
    }
  });
  const [styleId, setStyleId] = useState(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("studio:styleId");
  });
  const [picked, setPicked] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(sessionStorage.getItem("studio:picked") || "[]");
    } catch {
      return [];
    }
  });
  const [placementRequest, setPlacementRequest] = useState(() => {
    if (typeof window === "undefined") return "Place these pictures naturally on the main empty wall.";
    return sessionStorage.getItem("studio:placement") || "Place these pictures naturally on the main empty wall.";
  });
  useEffect(() => {
    if (photo) sessionStorage.setItem("studio:photo", photo);
    else sessionStorage.removeItem("studio:photo");
  }, [photo]);
  useEffect(() => {
    sessionStorage.setItem("studio:media", JSON.stringify(media));
  }, [media]);
  useEffect(() => {
    if (styleId) sessionStorage.setItem("studio:styleId", styleId);
    else sessionStorage.removeItem("studio:styleId");
  }, [styleId]);
  useEffect(() => {
    sessionStorage.setItem("studio:picked", JSON.stringify(picked));
  }, [picked]);
  useEffect(() => {
    sessionStorage.setItem("studio:placement", placementRequest);
  }, [placementRequest]);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [progressStatus, setProgressStatus] = useState(null);
  const [lastError, setLastError] = useState(null);
  const baselineIdRef = useRef(null);
  const stage = useMutation({
    mutationFn: async () => {
      if (!photo || !styleId || picked.length === 0) throw new Error("Photo, style and at least one artwork required");
      try {
        const {
          render
        } = await fetchLatest();
        baselineIdRef.current = render?.id ?? null;
      } catch {
        baselineIdRef.current = null;
      }
      setLastError(null);
      setStartedAt(Date.now());
      setProgressStatus("uploading");
      return runStage({
        data: {
          sourceImageBase64: photo,
          styleId,
          artworkIds: picked,
          mediaFilter: media,
          placementRequest
        }
      });
    },
    onSuccess: (r) => {
      setResult({
        url: r.resultUrl,
        src: r.sourceUrl
      });
      setProgressStatus(null);
      setStartedAt(null);
      toast.success("Render ready");
    },
    onError: (e) => {
      const msg = e?.message ?? "Render failed";
      setLastError(msg);
      setProgressStatus(null);
      setStartedAt(null);
      toast.error(msg);
    }
  });
  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1e3)), 500);
    return () => clearInterval(t);
  }, [startedAt]);
  useEffect(() => {
    if (!stage.isPending) return;
    let cancelled = false;
    let consecutiveErrors = 0;
    const tick = async () => {
      try {
        const {
          render
        } = await fetchLatest();
        consecutiveErrors = 0;
        if (cancelled || !render) return;
        const isNew = render.id !== baselineIdRef.current;
        if (!isNew) {
          setProgressStatus("uploading");
          return;
        }
        setProgressStatus(render.status);
        if (render.status === "completed" && render.result_image_url) {
          setResult({
            url: render.result_image_url,
            src: render.source_image_url
          });
          setProgressStatus(null);
          setStartedAt(null);
          stage.reset();
          toast.success("Render ready");
        } else if (render.status === "failed") {
          const msg = render.error_message || "Render failed";
          setLastError(msg);
          setProgressStatus(null);
          setStartedAt(null);
          stage.reset();
          toast.error(msg);
        }
      } catch {
        consecutiveErrors++;
        if (consecutiveErrors >= 4) setProgressStatus("reconnecting");
      }
    };
    const id = setInterval(tick, 2500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [stage.isPending]);
  const progressLabel = useMemo(() => {
    if (!stage.isPending) return null;
    const base = progressStatus === "reconnecting" ? "Reconnecting…" : progressStatus === "processing" ? "Composing your room" : progressStatus === "uploading" ? "Uploading photo" : progressStatus === "pending" ? "Queued" : "Working";
    const phase = elapsed < 8 ? "uploading your room" : elapsed < 25 ? "analysing wall geometry" : elapsed < 50 ? "placing artworks in scene" : elapsed < 80 ? "matching lighting and shadows" : "finalising";
    return `${base} · ${phase} · ${elapsed}s`;
  }, [stage.isPending, progressStatus, elapsed]);
  async function onPick(file) {
    const toData = () => new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    try {
      let w0, h0, src;
      try {
        const bmp = await createImageBitmap(file, {
          imageOrientation: "from-image"
        });
        w0 = bmp.width;
        h0 = bmp.height;
        src = bmp;
      } catch {
        const dataUrl = await toData();
        const img = await new Promise((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = dataUrl;
        });
        w0 = img.naturalWidth;
        h0 = img.naturalHeight;
        src = img;
      }
      const s = Math.min(1, 1600 / Math.max(w0, h0));
      const w = Math.max(1, Math.round(w0 * s)), h = Math.max(1, Math.round(h0 * s));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) {
        setPhoto(await toData());
        return;
      }
      ctx.drawImage(src, 0, 0, w, h);
      if ("close" in src && typeof src.close === "function") src.close();
      setPhoto(c.toDataURL("image/jpeg", 0.85));
    } catch {
      try {
        setPhoto(await toData());
      } catch {
      }
    }
  }
  const artworks = (data?.artworks ?? []).map((a, index) => ({
    ...a,
    image_url: localImageForKey(a.id || a.title || "artwork", index)
  })).filter((a) => media.length === 0 || media.includes(a.medium));
  const artistName = (id) => data?.artists.find((x) => x.id === id)?.name ?? "";
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx("header", { className: "border-b border-border", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-6xl items-center justify-between px-6 py-4", children: [
      /* @__PURE__ */ jsx(Link, { to: "/", className: "font-display text-xl", children: "MyAfriart" }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 text-sm", children: [
        /* @__PURE__ */ jsx(NotifyBell, {}),
        /* @__PURE__ */ jsx(Link, { to: "/notify", className: "text-muted-foreground hover:text-foreground", children: "NotifyMe" }),
        /* @__PURE__ */ jsx(Link, { to: "/renders", className: "text-muted-foreground hover:text-foreground", children: "My renders" }),
        isAdmin && /* @__PURE__ */ jsx(Link, { to: "/admin", className: "font-medium text-foreground hover:underline", children: "Admin" }),
        /* @__PURE__ */ jsx("button", { onClick: () => window.location.reload(), className: "text-muted-foreground hover:text-foreground", title: "Reload page", children: "↻ Refresh" }),
        /* @__PURE__ */ jsx("button", { onClick: () => supabase.auth.signOut(), className: "text-muted-foreground hover:text-foreground", children: "Sign out" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("main", { className: "mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[1fr_360px]", children: [
      /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsx("h1", { className: "font-display text-3xl", children: "Studio" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Stage curated artworks on a wall in your room." }),
        /* @__PURE__ */ jsx("div", { className: "mt-6 overflow-hidden rounded-md border border-border bg-card", children: result ? /* @__PURE__ */ jsx(BeforeAfter, { before: result.src, after: result.url }) : photo ? /* @__PURE__ */ jsx("img", { src: photo, alt: "Your room", className: "aspect-[4/3] w-full object-cover" }) : /* @__PURE__ */ jsxs("button", { onClick: () => fileRef.current?.click(), className: "flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 bg-muted text-muted-foreground hover:bg-accent", children: [
          /* @__PURE__ */ jsx("div", { className: "font-display text-2xl", children: "Upload or capture your room" }),
          /* @__PURE__ */ jsx("div", { className: "text-xs uppercase tracking-wider", children: "JPG · PNG · max 10MB" })
        ] }) }),
        /* @__PURE__ */ jsx("input", { ref: fileRef, type: "file", accept: "image/*", capture: "environment", className: "hidden", onChange: (e) => e.target.files?.[0] && onPick(e.target.files[0]) }),
        /* @__PURE__ */ jsxs("div", { className: "mt-3 flex gap-2", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => fileRef.current?.click(), className: "rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent", children: photo ? "Replace photo" : "Choose photo" }),
          result && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("a", { href: result.url, download: true, className: "rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent", children: "Download" }),
            /* @__PURE__ */ jsx("button", { onClick: () => setResult(null), className: "rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent", children: "New render" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("aside", { className: "space-y-6", children: [
        /* @__PURE__ */ jsx(Field, { label: "Medium", children: /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: MEDIA.map((m) => {
          const on = media.includes(m.v);
          return /* @__PURE__ */ jsx("button", { onClick: () => setMedia(on ? media.filter((x) => x !== m.v) : [...media, m.v]), className: `rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`, children: m.l }, m.v);
        }) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Style", children: /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-2", children: (data?.styles ?? []).map((s) => /* @__PURE__ */ jsxs("button", { onClick: () => setStyleId(s.id), className: `rounded-md border px-3 py-2 text-left text-sm ${styleId === s.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`, children: [
          /* @__PURE__ */ jsx("div", { className: "font-medium", children: s.name }),
          s.description && /* @__PURE__ */ jsx("div", { className: "mt-0.5 text-[11px] text-muted-foreground", children: s.description })
        ] }, s.id)) }) }),
        /* @__PURE__ */ jsx(Field, { label: `Artworks (${picked.length}/3)`, children: isLoading ? /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Loading catalogue…" }) : /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
          artworks.map((a) => {
            const on = picked.includes(a.id);
            return /* @__PURE__ */ jsxs("button", { onClick: () => setPicked(on ? picked.filter((x) => x !== a.id) : picked.length < 3 ? [...picked, a.id] : picked), className: `group relative aspect-square overflow-hidden rounded border ${on ? "border-primary ring-2 ring-primary" : "border-border"}`, title: `${a.title} — ${artistName(a.artist_id)}`, children: [
              /* @__PURE__ */ jsx("img", { src: localImageForKey(a.id || a.title), alt: a.title, className: "h-full w-full object-cover" }),
              on && /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-primary/20" })
            ] }, a.id);
          }),
          artworks.length === 0 && /* @__PURE__ */ jsx("div", { className: "col-span-3 text-xs text-muted-foreground", children: "No artworks match this filter." })
        ] }) }),
        /* @__PURE__ */ jsx(Field, { label: "Placement request", children: /* @__PURE__ */ jsx("textarea", { value: placementRequest, onChange: (e) => setPlacementRequest(e.target.value), maxLength: 500, className: "min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm", placeholder: "Example: Put two framed prints above the sofa and one small piece near the lamp." }) }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("button", { disabled: stage.isPending || !photo || !styleId || picked.length === 0, onClick: () => stage.mutate(), className: "w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40", children: stage.isPending ? "Composing your room…" : lastError ? "Try again" : "Stage the room" }),
          stage.isPending && /* @__PURE__ */ jsxs("div", { className: "rounded-md border border-border bg-card p-3 text-xs", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("span", { className: "inline-block h-2 w-2 animate-pulse rounded-full bg-primary" }),
              /* @__PURE__ */ jsx("span", { className: "font-medium text-foreground", children: progressLabel })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-2 h-1 w-full overflow-hidden rounded bg-muted", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-primary transition-all", style: {
              width: `${Math.min(95, 10 + elapsed * 1.1)}%`
            } }) }),
            /* @__PURE__ */ jsx("div", { className: "mt-2 text-muted-foreground", children: "Renders typically take 30–90 seconds. You can leave this page open." })
          ] }),
          !stage.isPending && lastError && /* @__PURE__ */ jsxs("div", { className: "rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs", children: [
            /* @__PURE__ */ jsx("div", { className: "font-medium text-destructive", children: "Render failed" }),
            /* @__PURE__ */ jsx("div", { className: "mt-1 text-muted-foreground", children: lastError }),
            /* @__PURE__ */ jsx("button", { onClick: () => {
              setLastError(null);
              stage.mutate();
            }, className: "mt-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent", children: "Retry render" })
          ] })
        ] })
      ] })
    ] })
  ] });
}
function Field({
  label,
  children
}) {
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { className: "mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground", children: label }),
    children
  ] });
}
function BeforeAfter({
  before,
  after
}) {
  const [pct, setPct] = useState(50);
  return /* @__PURE__ */ jsxs("div", { className: "relative aspect-[4/3] w-full select-none overflow-hidden bg-black", children: [
    /* @__PURE__ */ jsx("img", { src: after, alt: "Staged", className: "absolute inset-0 h-full w-full object-cover" }),
    /* @__PURE__ */ jsx("div", { className: "absolute inset-0 overflow-hidden", style: {
      width: `${pct}%`
    }, children: /* @__PURE__ */ jsx("img", { src: before, alt: "Original", className: "h-full w-full object-cover", style: {
      width: `${100 / (pct / 100)}%`,
      maxWidth: "none"
    } }) }),
    /* @__PURE__ */ jsx("div", { className: "absolute inset-y-0", style: {
      left: `${pct}%`
    }, children: /* @__PURE__ */ jsx("div", { className: "h-full w-px bg-white/80" }) }),
    /* @__PURE__ */ jsx("input", { type: "range", min: 0, max: 100, value: pct, onChange: (e) => setPct(+e.target.value), className: "absolute inset-x-0 bottom-3 mx-auto w-2/3 accent-primary" })
  ] });
}
export {
  Studio as component
};
