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
function CheckoutCallback() {
  const search = useSearch({
    strict: false
  });
  const reference = search.ref ?? search.reference;
  const verify = useServerFn(verifyPayment);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    if (!reference) {
      setStatus("fail");
      return;
    }
    verify({
      data: {
        reference
      }
    }).then(() => setStatus("ok")).catch(() => setStatus("fail"));
  }, [reference]);
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-md p-10 text-center", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-xl font-semibold", children: "Payment" }),
    status === "loading" && /* @__PURE__ */ jsx("p", { className: "mt-4", children: "Verifying payment…" }),
    status === "ok" && /* @__PURE__ */ jsx("p", { className: "mt-4 text-green-700", children: "Payment confirmed. Thank you." }),
    status === "fail" && /* @__PURE__ */ jsx("p", { className: "mt-4 text-destructive", children: "Payment could not be verified." }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 flex justify-center gap-4 text-sm", children: [
      /* @__PURE__ */ jsx(Link, { to: "/", className: "underline", children: "Return home" }),
      /* @__PURE__ */ jsx(Link, { to: "/disputes", className: "underline", children: "View payments & disputes" })
    ] })
  ] });
}
export {
  CheckoutCallback as component
};
