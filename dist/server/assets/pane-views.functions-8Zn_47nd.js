import { c as createSsrRpc } from "./createSsrRpc-Def-olcZ.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
const PaneIdSchema = z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/);
const recordPaneView = createServerFn({
  method: "POST"
}).inputValidator((d) => z.object({
  pane_id: PaneIdSchema,
  session_id: z.string().min(8).max(64).regex(/^[a-zA-Z0-9_-]+$/)
}).parse(d)).handler(createSsrRpc("4aaca30c84308a32a12b8056ce1d9b092520b352bfbf0c424377b4e8f8470765"));
const getPaneViewStats = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("010e9fd6b254f928f194dee6f3b3ba2bd38d570d69cf422baade968d8144f754"));
const getLandingPanes = createServerFn({
  method: "GET"
}).handler(createSsrRpc("0d95ed15c3127bf2f5345c365311b52baf138304029248523325ef30956a44ab"));
export {
  getLandingPanes as a,
  getPaneViewStats as g,
  recordPaneView as r
};
