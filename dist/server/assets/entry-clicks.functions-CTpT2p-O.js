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
const EntryPointSchema = z.enum(["sell_your_work", "stage_virtually"]);
const LocationSchema = z.string().min(1).max(120);
const SessionIdSchema = z.string().min(8).max(64).regex(/^[a-zA-Z0-9_-]+$/);
const recordEntryClick_createServerFn_handler = createServerRpc({
  id: "a74e1045cd7a0f3a821081d3f8641a8989318dbb6fc03d030a49fef87723a5fb",
  name: "recordEntryClick",
  filename: "src/lib/entry-clicks.functions.ts"
}, (opts) => recordEntryClick.__executeServer(opts));
const recordEntryClick = createServerFn({
  method: "POST"
}).inputValidator((d) => z.object({
  entry_point: EntryPointSchema,
  location: LocationSchema,
  session_id: SessionIdSchema,
  user_id: z.string().uuid().optional().nullable()
}).parse(d)).handler(recordEntryClick_createServerFn_handler, async ({
  data
}) => {
  const {
    error
  } = await (await __get_admin()).from("entry_clicks").insert({
    entry_point: data.entry_point,
    location: data.location,
    session_id: data.session_id,
    user_id: data.user_id ?? null
  });
  if (error) {
    console.error("[entry-clicks] insert error:", error.message);
    return {
      ok: false
    };
  }
  return {
    ok: true
  };
});
const getEntryClickStats_createServerFn_handler = createServerRpc({
  id: "4c6987d6c146ee428ebd850cb140551ad250799ad3d09ab3206687e52cd7eade",
  name: "getEntryClickStats",
  filename: "src/lib/entry-clicks.functions.ts"
}, (opts) => getEntryClickStats.__executeServer(opts));
const getEntryClickStats = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(getEntryClickStats_createServerFn_handler, async ({
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
  }] = await Promise.all([(await __get_admin()).from("entry_clicks").select("entry_point, location"), (await __get_admin()).from("entry_clicks").select("entry_point, location").gte("created_at", since)]);
  const count = (rows) => {
    const m = {};
    for (const r of rows ?? []) {
      const key = `${r.entry_point}::${r.location}`;
      m[key] = (m[key] ?? 0) + 1;
    }
    return m;
  };
  return {
    all: count(allRows),
    last30: count(recentRows)
  };
});
export {
  getEntryClickStats_createServerFn_handler,
  recordEntryClick_createServerFn_handler
};
