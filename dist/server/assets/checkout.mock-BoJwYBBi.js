import { jsxs, jsx } from "react/jsx-runtime";
import { useSearch, Link } from "@tanstack/react-router";
import { u as useServerFn } from "./router-9tDYEkuI.js";
import { useState, useEffect } from "react";
import { v as verifyPayment } from "./payments.functions-BxN3htHl.js";
import "@tanstack/react-query";
import "sonner";
import "./client-BWo_yy_6.js";
import "@supabase/supabase-js";
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
import "@tanstack/zod-adapter";
import "ai";
import "@ai-sdk/openai-compatible";
import "node:crypto";
import "jose";
import "./client.server-D5ro3rAQ.js";
function MockCheckout() {
  const {
    ref,
    amount
  } = useSearch({
    strict: false
  });
  const verify = useServerFn(verifyPayment);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!ref || done) return;
    verify({
      data: {
        reference: ref
      }
    }).then(() => setDone(true)).catch(() => setDone(false));
  }, [ref, done]);
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-md p-10 text-center", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-xl font-semibold", children: "Mock payment" }),
    /* @__PURE__ */ jsxs("p", { className: "mt-2 text-sm text-muted-foreground", children: [
      "Reference ",
      ref,
      " · ₦",
      Number(amount ?? 0).toLocaleString()
    ] }),
    done ? /* @__PURE__ */ jsx("p", { className: "mt-4 text-green-700", children: "Payment recorded successfully." }) : /* @__PURE__ */ jsx("p", { className: "mt-4 text-muted-foreground", children: "Processing…" }),
    /* @__PURE__ */ jsx(Link, { to: "/", className: "mt-6 inline-block underline", children: "Return home" })
  ] });
}
export {
  MockCheckout as component
};
