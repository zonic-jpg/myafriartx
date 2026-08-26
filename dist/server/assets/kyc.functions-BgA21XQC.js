import { c as createSsrRpc } from "./createSsrRpc-Def-olcZ.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
import { I as ID_TYPES } from "./kyc-constants-C5-iGq5J.js";
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
const getMyVerification = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("ad2f61302c489d92acd81875b03377a25b897f521f790aa5dbfaff7fd29c2872"));
const submitVerification = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  fullName: z.string().min(3).max(120),
  idType: z.enum(ID_TYPES),
  idReference: z.string().min(4).max(60),
  documentBase64: z.string().min(100).max(12e6),
  filename: z.string().min(1).max(200)
}).parse(d)).handler(createSsrRpc("25d416a2e8af35b621eaf3c2a0974a3827eaf86a05de2278bbaf4301afb8f2d0"));
const adminListVerifications = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  status: z.enum(["pending", "verified", "rejected", "all"]).default("pending")
}).parse(d ?? {})).handler(createSsrRpc("e807b7035622cd9f2d073bb64252a28f9b94753afac906d7215d3cf261bb6563"));
const adminGetDocumentUrl = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  userId: z.string().uuid()
}).parse(d)).handler(createSsrRpc("4c617f8e8cf8cd21909892ba9335e00ec6a7b48cb6ee9e21ec9e0a6c16dcbd77"));
const adminReviewVerification = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  userId: z.string().uuid(),
  decision: z.enum(["verified", "rejected"]),
  reason: z.string().max(500).optional()
}).refine((v) => v.decision !== "rejected" || (v.reason ?? "").trim().length >= 5, {
  message: "A rejection reason is required so the member knows what to fix."
}).parse(d)).handler(createSsrRpc("2b2ce5321bc732b578857f52b94076ac9769640ed435762079cdb03b04d4d9eb"));
async function requireVerifiedMember(userId, action) {
  const admin = await __get_admin();
  const {
    data
  } = await admin.rpc("is_member_verified", {
    p_user_id: userId
  });
  if (!data) {
    throw new Error(`Identity verification is required to ${action}. Complete verification at /verification.`);
  }
}
export {
  adminGetDocumentUrl,
  adminListVerifications,
  adminReviewVerification,
  getMyVerification,
  requireVerifiedMember,
  submitVerification
};
