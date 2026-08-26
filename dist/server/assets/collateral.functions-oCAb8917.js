import { c as createServerRpc } from "./createServerRpc-BDiocLCN.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
import { requireVerifiedMember } from "./kyc.functions-BgA21XQC.js";
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
import "./createSsrRpc-Def-olcZ.js";
import "./kyc-constants-C5-iGq5J.js";
const __get_admin = () => import("./client.server-D5ro3rAQ.js").then((m) => m.supabaseAdmin);
async function assertAdmin(userId) {
  const {
    data
  } = await (await __get_admin()).from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}
const listMyCollateral_createServerFn_handler = createServerRpc({
  id: "059a495d427663b3c5fa146ff82adeb161405c9cef8388029084a8a7dc7e9683",
  name: "listMyCollateral",
  filename: "src/lib/collateral.functions.ts"
}, (opts) => listMyCollateral.__executeServer(opts));
const listMyCollateral = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(listMyCollateral_createServerFn_handler, async ({
  context
}) => {
  const {
    data,
    error
  } = await context.supabase.from("collateral_pledges").select("*").eq("user_id", context.userId).order("created_at", {
    ascending: false
  });
  if (error) throw new Error(error.message);
  return data ?? [];
});
const requestCollateral_createServerFn_handler = createServerRpc({
  id: "7f667a429c2a97a8720f156846c0f08423fb5b86046fe3c04c8232ac6ffede91",
  name: "requestCollateral",
  filename: "src/lib/collateral.functions.ts"
}, (opts) => requestCollateral.__executeServer(opts));
const requestCollateral = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  artworkId: z.string().uuid().optional().nullable(),
  title: z.string().min(2).max(200),
  appraisedValueNgn: z.number().int().positive(),
  loanAmountNgn: z.number().int().positive(),
  notes: z.string().max(2e3).optional()
}).parse(d)).handler(requestCollateral_createServerFn_handler, async ({
  data,
  context
}) => {
  await requireVerifiedMember(context.userId, "pledge art as collateral");
  const {
    data: row,
    error
  } = await context.supabase.from("collateral_pledges").insert({
    user_id: context.userId,
    artwork_id: data.artworkId ?? null,
    title: data.title,
    appraised_value_ngn: data.appraisedValueNgn,
    loan_amount_ngn: data.loanAmountNgn,
    status: "pending_auth",
    authentication_notes: data.notes ?? null
  }).select("id").single();
  if (error) throw new Error(error.message);
  return {
    id: row.id
  };
});
const adminListCollateral_createServerFn_handler = createServerRpc({
  id: "b5556e2e9a80c929233211499a6604d994a05b26d90133806be63fcba74855a9",
  name: "adminListCollateral",
  filename: "src/lib/collateral.functions.ts"
}, (opts) => adminListCollateral.__executeServer(opts));
const adminListCollateral = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(adminListCollateral_createServerFn_handler, async ({
  context
}) => {
  await assertAdmin(context.userId);
  const {
    data,
    error
  } = await (await __get_admin()).from("collateral_pledges").select("*").order("created_at", {
    ascending: false
  }).limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
});
const adminUpdateCollateral_createServerFn_handler = createServerRpc({
  id: "d192738bc88affc68c844d5aca1df864409bd6084c722730bf15ad7bba90a9f7",
  name: "adminUpdateCollateral",
  filename: "src/lib/collateral.functions.ts"
}, (opts) => adminUpdateCollateral.__executeServer(opts));
const adminUpdateCollateral = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid(),
  status: z.enum(["pending_auth", "authenticated", "active", "released", "rejected"]),
  certificateUrl: z.string().url().optional().nullable(),
  notes: z.string().max(2e3).optional().nullable()
}).parse(d)).handler(adminUpdateCollateral_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const patch = {
    status: data.status,
    authentication_notes: data.notes,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (data.certificateUrl) patch.certificate_url = data.certificateUrl;
  if (data.status === "authenticated" || data.status === "active") {
    patch.reviewed_by = context.userId;
    patch.reviewed_at = (/* @__PURE__ */ new Date()).toISOString();
  }
  if (data.status === "released") patch.released_at = (/* @__PURE__ */ new Date()).toISOString();
  const admin = await __get_admin();
  const {
    data: pledge
  } = await admin.from("collateral_pledges").select("artwork_id").eq("id", data.id).single();
  const {
    error
  } = await admin.from("collateral_pledges").update(patch).eq("id", data.id);
  if (error) throw new Error(error.message);
  if (pledge?.artwork_id) {
    if (data.status === "active" || data.status === "authenticated") {
      await admin.from("artworks").update({
        is_pledged: true,
        pledge_id: data.id
      }).eq("id", pledge.artwork_id);
    }
    if (data.status === "released" || data.status === "rejected") {
      await admin.from("artworks").update({
        is_pledged: false,
        pledge_id: null
      }).eq("id", pledge.artwork_id);
    }
  }
  return {
    ok: true
  };
});
export {
  adminListCollateral_createServerFn_handler,
  adminUpdateCollateral_createServerFn_handler,
  listMyCollateral_createServerFn_handler,
  requestCollateral_createServerFn_handler
};
