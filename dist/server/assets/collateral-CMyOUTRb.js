import { jsx, jsxs } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { u as useServerFn, S as SiteFooter } from "./router-9tDYEkuI.js";
import { useState, useEffect } from "react";
import { s as supabase } from "./client-BWo_yy_6.js";
import { l as listMyCollateral, r as requestCollateral } from "./collateral.functions-Bktfok7r.js";
import { getMyVerification } from "./kyc.functions-BgA21XQC.js";
import "@tanstack/react-query";
import "sonner";
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
import "./kyc-constants-C5-iGq5J.js";
function CollateralPage() {
  const [authed, setAuthed] = useState(null);
  const [rows, setRows] = useState([]);
  const [kycStatus, setKycStatus] = useState(null);
  const listFn = useServerFn(listMyCollateral);
  const requestFn = useServerFn(requestCollateral);
  const kycFn = useServerFn(getMyVerification);
  const [title, setTitle] = useState("");
  const [appraised, setAppraised] = useState("");
  const [loan, setLoan] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    supabase.auth.getSession().then(({
      data
    }) => setAuthed(!!data.session));
  }, []);
  useEffect(() => {
    if (!authed) return;
    listFn().then(setRows).catch(() => setRows([]));
    kycFn().then((v) => setKycStatus(v.status)).catch(() => setKycStatus("unverified"));
  }, [authed]);
  async function submit(e) {
    e.preventDefault();
    setMsg("");
    try {
      await requestFn({
        data: {
          title,
          appraisedValueNgn: Number(appraised),
          loanAmountNgn: Number(loan)
        }
      });
      setMsg("Collateral request submitted — pending authentication.");
      setTitle("");
      setAppraised("");
      setLoan("");
      setRows(await listFn());
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Request failed");
    }
  }
  if (authed === null) return /* @__PURE__ */ jsx("p", { className: "p-8 text-center", children: "Loading…" });
  if (!authed) {
    return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-lg p-8 text-center", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold", children: "Art as collateral" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-muted-foreground", children: "Sign in to pledge authenticated works." }),
      /* @__PURE__ */ jsx(Link, { to: "/login", className: "mt-4 inline-block underline", children: "Sign in" })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx("header", { className: "border-b px-6 py-4", children: /* @__PURE__ */ jsx(Link, { to: "/", className: "font-display text-lg", children: "MyAfriart" }) }),
    /* @__PURE__ */ jsxs("main", { className: "mx-auto max-w-3xl space-y-8 px-6 py-10", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold", children: "Collateral portal" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Pledge authenticated art. Admin verifies provenance before collateral is activated." })
      ] }),
      kycStatus !== null && kycStatus !== "verified" && /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm", children: [
        /* @__PURE__ */ jsx("p", { className: "font-medium text-amber-900", children: "Identity verification required" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-amber-900/80", children: kycStatus === "pending" ? "Your verification is under review. You can pledge once approved." : "Pledging art as collateral requires a verified identity." }),
        kycStatus !== "pending" && /* @__PURE__ */ jsx(Link, { to: "/verification", className: "mt-2 inline-block rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white", children: "Verify your identity" })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "space-y-4 rounded-xl border p-6", children: [
        /* @__PURE__ */ jsx("input", { className: "w-full rounded border px-3 py-2 text-sm", placeholder: "Artwork title", value: title, onChange: (e) => setTitle(e.target.value), required: true }),
        /* @__PURE__ */ jsx("input", { className: "w-full rounded border px-3 py-2 text-sm", placeholder: "Appraised value (₦)", type: "number", value: appraised, onChange: (e) => setAppraised(e.target.value), required: true }),
        /* @__PURE__ */ jsx("input", { className: "w-full rounded border px-3 py-2 text-sm", placeholder: "Loan amount requested (₦)", type: "number", value: loan, onChange: (e) => setLoan(e.target.value), required: true }),
        /* @__PURE__ */ jsx("button", { type: "submit", className: "rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground", children: "Submit for authentication" }),
        msg && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: msg })
      ] }),
      /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
        /* @__PURE__ */ jsx("h2", { className: "font-medium", children: "Your pledges" }),
        rows.map((r) => /* @__PURE__ */ jsxs("div", { className: "rounded-lg border p-4 text-sm", children: [
          /* @__PURE__ */ jsx("p", { className: "font-medium", children: String(r.title) }),
          /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground", children: [
            "₦",
            Number(r.loan_amount_ngn).toLocaleString(),
            " loan · ",
            String(r.status)
          ] }),
          r.certificate_url ? /* @__PURE__ */ jsx("a", { href: String(r.certificate_url), className: "mt-1 inline-block text-primary underline", target: "_blank", rel: "noreferrer", children: "View authentication certificate" }) : null
        ] }, String(r.id))),
        rows.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "No pledges yet." })
      ] })
    ] }),
    /* @__PURE__ */ jsx(SiteFooter, {})
  ] });
}
export {
  CollateralPage as component
};
