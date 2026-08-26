import { c as createServerRpc } from "./createServerRpc-BDiocLCN.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "@supabase/supabase-js";
const __get_admin = () => import("./client.server-D5ro3rAQ.js").then((m) => m.supabaseAdmin);
const PaneIdSchema = z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/);
const recordPaneView_createServerFn_handler = createServerRpc({
  id: "4aaca30c84308a32a12b8056ce1d9b092520b352bfbf0c424377b4e8f8470765",
  name: "recordPaneView",
  filename: "src/lib/pane-views.functions.ts"
}, (opts) => recordPaneView.__executeServer(opts));
const recordPaneView = createServerFn({
  method: "POST"
}).inputValidator((d) => z.object({
  pane_id: PaneIdSchema,
  session_id: z.string().min(8).max(64).regex(/^[a-zA-Z0-9_-]+$/)
}).parse(d)).handler(recordPaneView_createServerFn_handler, async ({
  data
}) => {
  const FALLBACK_PANE_IDS = /* @__PURE__ */ new Set(["artist", "event", "piece", "stage", "auction", "lounge"]);
  if (!FALLBACK_PANE_IDS.has(data.pane_id)) {
    const {
      data: pane
    } = await (await __get_admin()).from("landing_panes").select("pane_id").eq("pane_id", data.pane_id).eq("is_active", true).eq("status", "published").maybeSingle();
    if (!pane) return {
      ok: false
    };
  }
  const {
    error
  } = await (await __get_admin()).from("pane_views").insert({
    pane_id: data.pane_id,
    session_id: data.session_id
  });
  if (error) {
    console.error("[pane-views] insert error:", error.message);
    return {
      ok: false
    };
  }
  return {
    ok: true
  };
});
const getPaneViewStats_createServerFn_handler = createServerRpc({
  id: "010e9fd6b254f928f194dee6f3b3ba2bd38d570d69cf422baade968d8144f754",
  name: "getPaneViewStats",
  filename: "src/lib/pane-views.functions.ts"
}, (opts) => getPaneViewStats.__executeServer(opts));
const getPaneViewStats = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(getPaneViewStats_createServerFn_handler, async ({
  context
}) => {
  const {
    data: role
  } = await (await __get_admin()).from("user_roles").select("id").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (!role) throw new Error("Forbidden: admin only");
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString();
  const [{
    data: allRows
  }, {
    data: recentRows
  }] = await Promise.all([(await __get_admin()).from("pane_views").select("pane_id"), (await __get_admin()).from("pane_views").select("pane_id").gte("created_at", since)]);
  const count = (rows) => {
    const m = {};
    for (const r of rows ?? []) m[r.pane_id] = (m[r.pane_id] ?? 0) + 1;
    return m;
  };
  return {
    all: count(allRows),
    last30: count(recentRows)
  };
});
const getLandingPanes_createServerFn_handler = createServerRpc({
  id: "0d95ed15c3127bf2f5345c365311b52baf138304029248523325ef30956a44ab",
  name: "getLandingPanes",
  filename: "src/lib/pane-views.functions.ts"
}, (opts) => getLandingPanes.__executeServer(opts));
const getLandingPanes = createServerFn({
  method: "GET"
}).handler(getLandingPanes_createServerFn_handler, async () => {
  const {
    data,
    error
  } = await (await __get_admin()).from("landing_panes").select("pane_id, kicker, title, summary, reveal, image_url, image_url_mobile, sort_order").eq("is_active", true).eq("status", "published").order("sort_order", {
    ascending: true
  });
  if (error) {
    console.error("[landing-panes] fetch error:", error.message);
    return {
      panes: []
    };
  }
  return {
    panes: data ?? []
  };
});
export {
  getLandingPanes_createServerFn_handler,
  getPaneViewStats_createServerFn_handler,
  recordPaneView_createServerFn_handler
};
