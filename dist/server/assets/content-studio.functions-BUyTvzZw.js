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
const contentSchema = z.object({
  content: z.record(z.record(z.string())),
  media: z.record(z.string().nullable())
});
const getSiteContent_createServerFn_handler = createServerRpc({
  id: "95456f5281b6f0e7bfcd91c53ae8fda1d51e66376f9c405775affae9bc237fe2",
  name: "getSiteContent",
  filename: "src/lib/content-studio.functions.ts"
}, (opts) => getSiteContent.__executeServer(opts));
const getSiteContent = createServerFn({
  method: "GET"
}).handler(getSiteContent_createServerFn_handler, async () => {
  const {
    data
  } = await (await __get_admin()).from("app_settings").select("value").eq("key", "site_content").maybeSingle();
  const val = data?.value;
  if (val && typeof val === "object" && "content" in val) {
    return val;
  }
  return null;
});
const publishSiteContent_createServerFn_handler = createServerRpc({
  id: "4d4e992fe94d55219e92f499b72e312c0aa2790f3a5326a1f0da379dcb123bcc",
  name: "publishSiteContent",
  filename: "src/lib/content-studio.functions.ts"
}, (opts) => publishSiteContent.__executeServer(opts));
const publishSiteContent = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => contentSchema.parse(d)).handler(publishSiteContent_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    error
  } = await (await __get_admin()).from("app_settings").upsert({
    key: "site_content",
    value: data,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
export {
  getSiteContent_createServerFn_handler,
  publishSiteContent_createServerFn_handler
};
