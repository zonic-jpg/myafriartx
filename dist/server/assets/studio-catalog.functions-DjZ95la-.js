import { c as createServerRpc } from "./createServerRpc-BDiocLCN.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
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
const signRenderImageUrls = async (...__a) => (await import("./render-urls.server-CqQfPe29.js")).signRenderImageUrls(...__a);
function readMockEnabled(value) {
  return typeof value === "boolean" ? value : true;
}
const getCatalog_createServerFn_handler = createServerRpc({
  id: "03f4f62b2b60454939f046704d8431111b2906942e7258e9aed68dec14f8d564",
  name: "getCatalog",
  filename: "src/lib/studio-catalog.functions.ts"
}, (opts) => getCatalog.__executeServer(opts));
const getCatalog = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(getCatalog_createServerFn_handler, async ({
  context
}) => {
  const {
    supabase
  } = context;
  const settings = await supabase.from("app_settings").select("value").eq("key", "mock_catalogue_enabled").maybeSingle();
  const source = readMockEnabled(settings.data?.value) ? "mock" : "live";
  const [styles, artworks, artists] = await Promise.all([supabase.from("styles").select("*").eq("is_active", true).order("sort_order"), supabase.from("artworks").select("*").eq("is_active", true).eq("content_source", source), supabase.from("artists").select("id,name").eq("content_source", source)]);
  return {
    styles: styles.data ?? [],
    artworks: artworks.data ?? [],
    artists: artists.data ?? []
  };
});
const getMyRenders_createServerFn_handler = createServerRpc({
  id: "414e9b8c74e988c541fc85629fa67e1d38706a488b6002217e85d9ecddfbbd03",
  name: "getMyRenders",
  filename: "src/lib/studio-catalog.functions.ts"
}, (opts) => getMyRenders.__executeServer(opts));
const getMyRenders = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(getMyRenders_createServerFn_handler, async ({
  context
}) => {
  const {
    supabase,
    userId
  } = context;
  const {
    data
  } = await supabase.from("renders").select("*").eq("user_id", userId).order("created_at", {
    ascending: false
  }).limit(50);
  return {
    renders: await Promise.all((data ?? []).map(signRenderImageUrls))
  };
});
const getLatestRender_createServerFn_handler = createServerRpc({
  id: "b61190700b9936ac80c0a33fc2caf1877a3767c0f60c663490b4cd40f82e221b",
  name: "getLatestRender",
  filename: "src/lib/studio-catalog.functions.ts"
}, (opts) => getLatestRender.__executeServer(opts));
const getLatestRender = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(getLatestRender_createServerFn_handler, async ({
  context
}) => {
  const {
    supabase,
    userId
  } = context;
  const {
    data
  } = await supabase.from("renders").select("id,status,result_image_url,source_image_url,error_message,created_at").eq("user_id", userId).order("created_at", {
    ascending: false
  }).limit(1).maybeSingle();
  return {
    render: data ? await signRenderImageUrls(data) : null
  };
});
export {
  getCatalog_createServerFn_handler,
  getLatestRender_createServerFn_handler,
  getMyRenders_createServerFn_handler
};
