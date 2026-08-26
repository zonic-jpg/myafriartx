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
async function assertAdmin(userId) {
  const {
    data
  } = await (await __get_admin()).from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}
const getThreadEscrow_createServerFn_handler = createServerRpc({
  id: "33dc219817f7d40be8233f2d5bda09c52568e9c84b28d741d541c46595e3f451",
  name: "getThreadEscrow",
  filename: "src/lib/escrow.functions.ts"
}, (opts) => getThreadEscrow.__executeServer(opts));
const getThreadEscrow = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  threadId: z.string().uuid()
}).parse(d)).handler(getThreadEscrow_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    data: holds,
    error
  } = await context.supabase.from("escrow_holds").select("*").eq("thread_id", data.threadId).order("created_at", {
    ascending: false
  }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return holds;
});
const adminReleaseEscrow_createServerFn_handler = createServerRpc({
  id: "241347fef28da0e4d9ff284121bb809a9c40b4cf2563ca2e58673f8749c48abd",
  name: "adminReleaseEscrow",
  filename: "src/lib/escrow.functions.ts"
}, (opts) => adminReleaseEscrow.__executeServer(opts));
const adminReleaseEscrow = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  escrowId: z.string().uuid(),
  reason: z.string().max(500).optional()
}).parse(d)).handler(adminReleaseEscrow_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const admin = await __get_admin();
  const {
    data: hold,
    error
  } = await admin.from("escrow_holds").select("*").eq("id", data.escrowId).single();
  if (error || !hold) throw new Error("Escrow not found");
  if (hold.status !== "held") throw new Error("Escrow already released");
  const {
    error: upErr
  } = await admin.from("escrow_holds").update({
    status: "released",
    release_reason: data.reason ?? "admin_release",
    released_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", data.escrowId);
  if (upErr) throw new Error(upErr.message);
  if (hold.listing_id) {
    await admin.from("listings").update({
      status: "closed"
    }).eq("id", hold.listing_id);
  }
  return {
    ok: true
  };
});
const adminListEscrow_createServerFn_handler = createServerRpc({
  id: "245b08c040b18592f107767052e20c202003e4712820222ecbe54ce785e5a7e3",
  name: "adminListEscrow",
  filename: "src/lib/escrow.functions.ts"
}, (opts) => adminListEscrow.__executeServer(opts));
const adminListEscrow = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(adminListEscrow_createServerFn_handler, async ({
  context
}) => {
  await assertAdmin(context.userId);
  const {
    data,
    error
  } = await (await __get_admin()).from("escrow_holds").select("*").eq("status", "held").order("created_at", {
    ascending: false
  }).limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
});
export {
  adminListEscrow_createServerFn_handler,
  adminReleaseEscrow_createServerFn_handler,
  getThreadEscrow_createServerFn_handler
};
