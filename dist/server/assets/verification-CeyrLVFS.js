import { jsx, jsxs } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { u as useServerFn } from "./router-9tDYEkuI.js";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { s as supabase } from "./client-BWo_yy_6.js";
import { getMyVerification, submitVerification } from "./kyc.functions-BgA21XQC.js";
import { I as ID_TYPES } from "./kyc-constants-C5-iGq5J.js";
import "@tanstack/react-query";
import "./createSsrRpc-Def-olcZ.js";
import "./server-xISFJUTE.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "zod";
import "./auth-middleware-DPJJ5M9W.js";
import "@supabase/supabase-js";
import "@tanstack/zod-adapter";
import "ai";
import "@ai-sdk/openai-compatible";
import "node:crypto";
import "jose";
import "./client.server-D5ro3rAQ.js";
const ID_LABELS = {
  nin: "National Identification Number (NIN)",
  passport: "International passport",
  drivers_licence: "Driver's licence",
  voters_card: "Voter's card"
};
function VerificationPage() {
  const navigate = useNavigate();
  const fetchStatus = useServerFn(getMyVerification);
  const submitFn = useServerFn(submitVerification);
  const [authed, setAuthed] = useState(null);
  const [record, setRecord] = useState(null);
  const [fullName, setFullName] = useState("");
  const [idType, setIdType] = useState("nin");
  const [idReference, setIdReference] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({
      data
    }) => {
      setAuthed(!!data.session);
      if (!data.session) navigate({
        to: "/login"
      });
    });
  }, [navigate]);
  useEffect(() => {
    if (!authed) return;
    fetchStatus().then(setRecord).catch(() => setRecord({
      status: "unverified"
    }));
  }, [authed]);
  const submit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Attach a photo or PDF of your ID document.");
    if (file.size > 8 * 1024 * 1024) return toast.error("Document must be under 8 MB.");
    setBusy(true);
    try {
      const documentBase64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      await submitFn({
        data: {
          fullName,
          idType,
          idReference,
          documentBase64,
          filename: file.name
        }
      });
      toast.success("Submitted — our team will review within 1–2 business days.");
      setRecord(await fetchStatus());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  };
  if (authed === null || authed && !record) {
    return /* @__PURE__ */ jsx("div", { className: "p-10 text-center text-muted-foreground", children: "Loading…" });
  }
  const status = record?.status ?? "unverified";
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto min-h-screen max-w-lg px-6 py-10", children: [
    /* @__PURE__ */ jsx(Link, { to: "/", className: "text-sm text-primary underline", children: "← MyAfriart" }),
    /* @__PURE__ */ jsx("h1", { className: "mt-6 font-display text-3xl", children: "Identity verification" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Verification is required to pledge art as collateral and for high-value escrow payments. Your document is stored privately and viewed only by our compliance team." }),
    status === "verified" && /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5", children: [
      /* @__PURE__ */ jsx("p", { className: "font-medium text-emerald-700", children: "✓ You are verified" }),
      /* @__PURE__ */ jsxs("p", { className: "mt-1 text-sm text-muted-foreground", children: [
        "Verified on",
        " ",
        record?.verified_at ? new Date(record.verified_at).toLocaleDateString() : "—",
        ". You have full access to collateral and escrow."
      ] })
    ] }),
    status === "pending" && /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-lg border border-amber-500/30 bg-amber-500/5 p-5", children: [
      /* @__PURE__ */ jsx("p", { className: "font-medium text-amber-700", children: "Under review" }),
      /* @__PURE__ */ jsxs("p", { className: "mt-1 text-sm text-muted-foreground", children: [
        "Submitted",
        " ",
        record?.submitted_at ? new Date(record.submitted_at).toLocaleString() : "recently",
        ". We typically review within 1–2 business days."
      ] })
    ] }),
    status === "rejected" && /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-5", children: [
      /* @__PURE__ */ jsx("p", { className: "font-medium text-destructive", children: "Submission rejected" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: record?.rejected_reason ?? "Please resubmit with a clearer document." })
    ] }),
    (status === "unverified" || status === "rejected") && /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "mt-8 space-y-4", children: [
      /* @__PURE__ */ jsxs("label", { className: "block", children: [
        /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: "Full legal name" }),
        /* @__PURE__ */ jsx("input", { required: true, value: fullName, onChange: (e) => setFullName(e.target.value), placeholder: "As it appears on your ID", className: "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" })
      ] }),
      /* @__PURE__ */ jsxs("label", { className: "block", children: [
        /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: "ID type" }),
        /* @__PURE__ */ jsx("select", { value: idType, onChange: (e) => setIdType(e.target.value), className: "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm", children: ID_TYPES.map((t) => /* @__PURE__ */ jsx("option", { value: t, children: ID_LABELS[t] }, t)) })
      ] }),
      /* @__PURE__ */ jsxs("label", { className: "block", children: [
        /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: "ID number" }),
        /* @__PURE__ */ jsx("input", { required: true, value: idReference, onChange: (e) => setIdReference(e.target.value), placeholder: "Document reference number", className: "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" })
      ] }),
      /* @__PURE__ */ jsxs("label", { className: "block", children: [
        /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: "ID document (JPG, PNG, WEBP or PDF, max 8 MB)" }),
        /* @__PURE__ */ jsx("input", { required: true, type: "file", accept: ".jpg,.jpeg,.png,.webp,.pdf", onChange: (e) => setFile(e.target.files?.[0] ?? null), className: "mt-1 block w-full text-sm" })
      ] }),
      /* @__PURE__ */ jsx("button", { disabled: busy, className: "rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50", children: busy ? "Uploading…" : "Submit for review" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "By submitting you confirm this document is yours and consent to identity checks for anti-fraud and regulatory compliance." })
    ] })
  ] });
}
export {
  VerificationPage as component
};
