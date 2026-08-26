import { jsx, jsxs } from "react/jsx-runtime";
import { o as Route, u as useServerFn } from "./router-9tDYEkuI.js";
import { useState, useEffect } from "react";
import { c as createSsrRpc } from "./createSsrRpc-Def-olcZ.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
import { Link } from "@tanstack/react-router";
import "@tanstack/react-query";
import "sonner";
import "./client-BWo_yy_6.js";
import "@supabase/supabase-js";
import "@tanstack/zod-adapter";
import "ai";
import "@ai-sdk/openai-compatible";
import "node:crypto";
import "jose";
import "./client.server-D5ro3rAQ.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  artworkId: z.string().uuid()
}).parse(d)).handler(createSsrRpc("8ce020947adc0fb5e704fc33b1a59327847a07f23713aff02cbae8d7da42b669"));
const verifyCertificate = createServerFn({
  method: "GET"
}).inputValidator((d) => z.object({
  code: z.string().min(6).max(20)
}).parse(d)).handler(createSsrRpc("d0eaf0474a501d3f8773b28e304efeba86119748059446ad70b386555761f66a"));
function VerifyCertPage() {
  const {
    code
  } = Route.useParams();
  const verifyFn = useServerFn(verifyCertificate);
  const [cert, setCert] = useState(void 0);
  const [err, setErr] = useState("");
  useEffect(() => {
    verifyFn({
      data: {
        code
      }
    }).then((c) => setCert(c)).catch((e) => setErr(e instanceof Error ? e.message : "Verification failed"));
  }, [code]);
  if (cert === void 0 && !err) {
    return /* @__PURE__ */ jsx("div", { className: "p-10 text-center text-muted-foreground", children: "Verifying certificate…" });
  }
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto min-h-screen max-w-lg p-8", children: [
    /* @__PURE__ */ jsx(Link, { to: "/", className: "text-sm text-primary underline", children: "← MyAfriart" }),
    /* @__PURE__ */ jsx("h1", { className: "mt-6 font-display text-2xl", children: "Certificate verification" }),
    /* @__PURE__ */ jsxs("p", { className: "mt-1 text-sm text-muted-foreground", children: [
      "Code: ",
      code.toUpperCase()
    ] }),
    err && /* @__PURE__ */ jsx("p", { className: "mt-6 text-destructive", children: err }),
    !cert && !err && /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4", children: [
      /* @__PURE__ */ jsx("p", { className: "font-medium text-destructive", children: "Certificate not found or revoked" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "This code does not match any active certificate in our registry." })
    ] }),
    cert && /* @__PURE__ */ jsxs("div", { className: "mt-6 space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-emerald-700", children: "✓ Valid certificate" }),
      /* @__PURE__ */ jsxs("dl", { className: "space-y-2 text-sm", children: [
        /* @__PURE__ */ jsx(Row, { label: "Title", value: String(cert.title) }),
        cert.artist_name && /* @__PURE__ */ jsx(Row, { label: "Artist", value: String(cert.artist_name) }),
        cert.owner_name && /* @__PURE__ */ jsx(Row, { label: "Owner", value: String(cert.owner_name) }),
        /* @__PURE__ */ jsx(Row, { label: "Issued", value: new Date(String(cert.issued_at)).toLocaleDateString() })
      ] }),
      cert.certificate_url && /* @__PURE__ */ jsx("a", { href: String(cert.certificate_url), target: "_blank", rel: "noreferrer", className: "inline-block rounded bg-primary px-4 py-2 text-sm text-primary-foreground", children: "Download PDF" })
    ] })
  ] });
}
function Row({
  label,
  value
}) {
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("dt", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: label }),
    /* @__PURE__ */ jsx("dd", { className: "font-medium", children: value })
  ] });
}
export {
  VerifyCertPage as component
};
