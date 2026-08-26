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
const listMyDisputablePayments_createServerFn_handler = createServerRpc({
  id: "691d8f25fa9e6694f0e5ec065385e55b62e779db4e7252263cd9258ae0001aae",
  name: "listMyDisputablePayments",
  filename: "src/lib/disputes.functions.ts"
}, (opts) => listMyDisputablePayments.__executeServer(opts));
const listMyDisputablePayments = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(listMyDisputablePayments_createServerFn_handler, async ({
  context
}) => {
  const admin = await __get_admin();
  const [{
    data: payments,
    error
  }, {
    data: disputes
  }] = await Promise.all([admin.from("payments").select("id, purpose, amount_ngn, status, provider_ref, metadata, created_at").eq("user_id", context.userId).in("status", ["succeeded", "refunded"]).order("created_at", {
    ascending: false
  }).limit(50), admin.from("payment_disputes").select("id, payment_id, status, reason, resolution, created_at, resolved_at").eq("opened_by", context.userId).order("created_at", {
    ascending: false
  })]);
  if (error) throw new Error(error.message);
  const byPayment = new Map((disputes ?? []).map((d) => [d.payment_id, d]));
  return (payments ?? []).map((p) => ({
    ...p,
    dispute: byPayment.get(p.id) ?? null
  }));
});
const openDispute_createServerFn_handler = createServerRpc({
  id: "8092e2690a17ade13077a2945c0041846b453dc669583aa44ec2dd0ff51090ec",
  name: "openDispute",
  filename: "src/lib/disputes.functions.ts"
}, (opts) => openDispute.__executeServer(opts));
const openDispute = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  paymentId: z.string().uuid(),
  reason: z.string().min(20, "Describe the problem in at least 20 characters").max(2e3)
}).parse(d)).handler(openDispute_createServerFn_handler, async ({
  data,
  context
}) => {
  const admin = await __get_admin();
  const {
    data: payment
  } = await admin.from("payments").select("id, user_id, status").eq("id", data.paymentId).eq("user_id", context.userId).maybeSingle();
  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "succeeded") throw new Error("Only completed payments can be disputed.");
  const {
    data: hold
  } = await admin.from("escrow_holds").select("id").eq("payment_id", data.paymentId).maybeSingle();
  const {
    error
  } = await admin.from("payment_disputes").insert({
    payment_id: data.paymentId,
    opened_by: context.userId,
    reason: data.reason,
    escrow_hold_id: hold?.id ?? null,
    status: "open"
  });
  if (error?.code === "23505") throw new Error("This payment already has an open dispute.");
  if (error) throw new Error(error.message);
  if (hold) {
    await admin.from("escrow_holds").update({
      status: "disputed"
    }).eq("id", hold.id).eq("status", "held");
  }
  return {
    ok: true
  };
});
const adminListDisputes_createServerFn_handler = createServerRpc({
  id: "142f58e9f0d4965cfdfa59317517bb05c69c3326a04cacf1b71b9e91506b7111",
  name: "adminListDisputes",
  filename: "src/lib/disputes.functions.ts"
}, (opts) => adminListDisputes.__executeServer(opts));
const adminListDisputes = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  status: z.enum(["open", "resolved", "rejected", "all"]).default("open")
}).parse(d ?? {})).handler(adminListDisputes_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const admin = await __get_admin();
  let q = admin.from("payment_disputes").select("*, payment:payments(id, purpose, amount_ngn, status, provider_ref, metadata)").order("created_at", {
    ascending: false
  }).limit(100);
  if (data.status !== "all") q = q.eq("status", data.status);
  const {
    data: rows,
    error
  } = await q;
  if (error) throw new Error(error.message);
  const ids = [...new Set((rows ?? []).map((r) => r.opened_by))];
  const {
    data: profiles
  } = ids.length ? await admin.from("profiles").select("id, display_name").in("id", ids) : {
    data: []
  };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? "Member"]));
  return (rows ?? []).map((r) => ({
    ...r,
    opener_name: names.get(r.opened_by) ?? "Member"
  }));
});
const adminResolveDispute_createServerFn_handler = createServerRpc({
  id: "03b566348d3135a1bedc1261a2bac3247c5516194ff68da4b305c179e69dc056",
  name: "adminResolveDispute",
  filename: "src/lib/disputes.functions.ts"
}, (opts) => adminResolveDispute.__executeServer(opts));
const adminResolveDispute = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  disputeId: z.string().uuid(),
  outcome: z.enum(["resolved", "rejected"]),
  resolution: z.string().min(10).max(2e3),
  refundEscrow: z.boolean().default(false)
}).parse(d)).handler(adminResolveDispute_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const admin = await __get_admin();
  const {
    data: result,
    error
  } = await admin.rpc("resolve_payment_dispute", {
    p_dispute_id: data.disputeId,
    p_resolution: data.resolution,
    p_outcome: data.outcome,
    p_refund_escrow: data.refundEscrow,
    p_admin_id: context.userId
  });
  if (error) throw new Error(error.message);
  const r = result;
  if (!r.ok) throw new Error(r.error === "already_closed" ? "Dispute already closed" : "Resolution failed");
  if (data.outcome === "rejected" && !data.refundEscrow) {
    const {
      data: d2
    } = await admin.from("payment_disputes").select("payment_id").eq("id", data.disputeId).single();
    if (d2) {
      await admin.from("escrow_holds").update({
        status: "held"
      }).eq("payment_id", d2.payment_id).eq("status", "disputed");
    }
  }
  return {
    ok: true
  };
});
export {
  adminListDisputes_createServerFn_handler,
  adminResolveDispute_createServerFn_handler,
  listMyDisputablePayments_createServerFn_handler,
  openDispute_createServerFn_handler
};
