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
const getArtworkProvenance_createServerFn_handler = createServerRpc({
  id: "8ce020947adc0fb5e704fc33b1a59327847a07f23713aff02cbae8d7da42b669",
  name: "getArtworkProvenance",
  filename: "src/lib/provenance.functions.ts"
}, (opts) => getArtworkProvenance.__executeServer(opts));
const getArtworkProvenance = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  artworkId: z.string().uuid()
}).parse(d)).handler(getArtworkProvenance_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    data: events,
    error
  } = await context.supabase.from("provenance_events").select("*").eq("artwork_id", data.artworkId).order("created_at", {
    ascending: true
  });
  if (error) throw new Error(error.message);
  return events ?? [];
});
const verifyCertificate_createServerFn_handler = createServerRpc({
  id: "d0eaf0474a501d3f8773b28e304efeba86119748059446ad70b386555761f66a",
  name: "verifyCertificate",
  filename: "src/lib/provenance.functions.ts"
}, (opts) => verifyCertificate.__executeServer(opts));
const verifyCertificate = createServerFn({
  method: "GET"
}).inputValidator((d) => z.object({
  code: z.string().min(6).max(20)
}).parse(d)).handler(verifyCertificate_createServerFn_handler, async ({
  data
}) => {
  const admin = await import("./client.server-D5ro3rAQ.js").then((m) => m.supabaseAdmin);
  const {
    data: cert,
    error
  } = await admin.from("certificate_registry").select("*").eq("verify_code", data.code.toUpperCase()).is("revoked_at", null).maybeSingle();
  if (error) throw new Error(error.message);
  return cert;
});
export {
  getArtworkProvenance_createServerFn_handler,
  verifyCertificate_createServerFn_handler
};
