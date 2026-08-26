import { c as createServerRpc } from "./createServerRpc-BDiocLCN.js";
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
function sniffDocMime(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 255 && buf[1] === 216 && buf[2] === 255) return "image/jpeg";
  if (buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71) return "image/png";
  if (buf[0] === 82 && buf[1] === 73 && buf[2] === 70 && buf[3] === 70 && buf[8] === 87)
    return "image/webp";
  if (buf[0] === 37 && buf[1] === 80 && buf[2] === 68 && buf[3] === 70)
    return "application/pdf";
  return null;
}
const __get_admin = () => import("./client.server-D5ro3rAQ.js").then((m) => m.supabaseAdmin);
async function assertAdmin(userId) {
  const {
    data
  } = await (await __get_admin()).from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}
const MAX_DOC_BYTES = 8 * 1024 * 1024;
const DOC_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf"
};
const getMyVerification_createServerFn_handler = createServerRpc({
  id: "ad2f61302c489d92acd81875b03377a25b897f521f790aa5dbfaff7fd29c2872",
  name: "getMyVerification",
  filename: "src/lib/kyc.functions.ts"
}, (opts) => getMyVerification.__executeServer(opts));
const getMyVerification = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(getMyVerification_createServerFn_handler, async ({
  context
}) => {
  const {
    data,
    error
  } = await (await __get_admin()).from("member_verifications").select("status, id_type, full_name, submitted_at, verified_at, rejected_reason").eq("user_id", context.userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? {
    status: "unverified"
  };
});
const submitVerification_createServerFn_handler = createServerRpc({
  id: "25d416a2e8af35b621eaf3c2a0974a3827eaf86a05de2278bbaf4301afb8f2d0",
  name: "submitVerification",
  filename: "src/lib/kyc.functions.ts"
}, (opts) => submitVerification.__executeServer(opts));
const submitVerification = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  fullName: z.string().min(3).max(120),
  idType: z.enum(ID_TYPES),
  idReference: z.string().min(4).max(60),
  documentBase64: z.string().min(100).max(12e6),
  filename: z.string().min(1).max(200)
}).parse(d)).handler(submitVerification_createServerFn_handler, async ({
  data,
  context
}) => {
  const admin = await __get_admin();
  const {
    data: existing
  } = await admin.from("member_verifications").select("status").eq("user_id", context.userId).maybeSingle();
  if (existing?.status === "verified") throw new Error("Your identity is already verified.");
  if (existing?.status === "pending") throw new Error("Your submission is under review. You will be notified once decided.");
  const b64 = data.documentBase64.includes(",") ? data.documentBase64.split(",")[1] : data.documentBase64;
  const bin = atob(b64);
  if (bin.length > MAX_DOC_BYTES) throw new Error("Document too large. Use a file under 8 MB.");
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const ext = (data.filename.split(".").pop() || "").toLowerCase();
  const declaredType = DOC_TYPES[ext];
  if (!declaredType) throw new Error("Use a JPG, PNG, WEBP, or PDF document.");
  const sniffedType = sniffDocMime(buf);
  if (!sniffedType || sniffedType !== declaredType) throw new Error("File contents do not match its extension.");
  const path = `${context.userId}/${crypto.randomUUID()}.${ext}`;
  const up = await admin.storage.from("kyc").upload(path, buf, {
    contentType: sniffedType,
    upsert: false
  });
  if (up.error) throw new Error("Document upload failed. Please try again.");
  const {
    error
  } = await admin.from("member_verifications").upsert({
    user_id: context.userId,
    status: "pending",
    full_name: data.fullName,
    id_type: data.idType,
    id_reference: data.idReference,
    document_path: path,
    submitted_at: (/* @__PURE__ */ new Date()).toISOString(),
    rejected_reason: null,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (error) throw new Error(error.message);
  return {
    ok: true,
    status: "pending"
  };
});
const adminListVerifications_createServerFn_handler = createServerRpc({
  id: "e807b7035622cd9f2d073bb64252a28f9b94753afac906d7215d3cf261bb6563",
  name: "adminListVerifications",
  filename: "src/lib/kyc.functions.ts"
}, (opts) => adminListVerifications.__executeServer(opts));
const adminListVerifications = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  status: z.enum(["pending", "verified", "rejected", "all"]).default("pending")
}).parse(d ?? {})).handler(adminListVerifications_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const admin = await __get_admin();
  let q = admin.from("member_verifications").select("user_id, status, full_name, id_type, id_reference, submitted_at, verified_at, rejected_reason, document_path").order("submitted_at", {
    ascending: false,
    nullsFirst: false
  }).limit(200);
  if (data.status !== "all") q = q.eq("status", data.status);
  const {
    data: rows,
    error
  } = await q;
  if (error) throw new Error(error.message);
  const ids = (rows ?? []).map((r) => r.user_id);
  const {
    data: profiles
  } = ids.length ? await admin.from("profiles").select("id, display_name").in("id", ids) : {
    data: []
  };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? "Member"]));
  return (rows ?? []).map((r) => ({
    ...r,
    display_name: names.get(r.user_id) ?? "Member"
  }));
});
const adminGetDocumentUrl_createServerFn_handler = createServerRpc({
  id: "4c617f8e8cf8cd21909892ba9335e00ec6a7b48cb6ee9e21ec9e0a6c16dcbd77",
  name: "adminGetDocumentUrl",
  filename: "src/lib/kyc.functions.ts"
}, (opts) => adminGetDocumentUrl.__executeServer(opts));
const adminGetDocumentUrl = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  userId: z.string().uuid()
}).parse(d)).handler(adminGetDocumentUrl_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const admin = await __get_admin();
  const {
    data: row
  } = await admin.from("member_verifications").select("document_path").eq("user_id", data.userId).maybeSingle();
  if (!row?.document_path) throw new Error("No document on file");
  const {
    data: signed,
    error
  } = await admin.storage.from("kyc").createSignedUrl(row.document_path, 600);
  if (error || !signed) throw new Error("Could not sign document URL");
  return {
    url: signed.signedUrl
  };
});
const adminReviewVerification_createServerFn_handler = createServerRpc({
  id: "2b2ce5321bc732b578857f52b94076ac9769640ed435762079cdb03b04d4d9eb",
  name: "adminReviewVerification",
  filename: "src/lib/kyc.functions.ts"
}, (opts) => adminReviewVerification.__executeServer(opts));
const adminReviewVerification = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  userId: z.string().uuid(),
  decision: z.enum(["verified", "rejected"]),
  reason: z.string().max(500).optional()
}).refine((v) => v.decision !== "rejected" || (v.reason ?? "").trim().length >= 5, {
  message: "A rejection reason is required so the member knows what to fix."
}).parse(d)).handler(adminReviewVerification_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const admin = await __get_admin();
  const patch = {
    status: data.decision,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (data.decision === "verified") {
    patch.verified_at = (/* @__PURE__ */ new Date()).toISOString();
    patch.verified_by = context.userId;
    patch.rejected_reason = null;
  } else {
    patch.rejected_reason = data.reason;
    patch.verified_at = null;
    patch.verified_by = null;
  }
  const {
    error
  } = await admin.from("member_verifications").update(patch).eq("user_id", data.userId).eq("status", "pending");
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
export {
  adminGetDocumentUrl_createServerFn_handler,
  adminListVerifications_createServerFn_handler,
  adminReviewVerification_createServerFn_handler,
  getMyVerification_createServerFn_handler,
  submitVerification_createServerFn_handler
};
