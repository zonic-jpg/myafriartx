import { c as createSsrRpc } from "./createSsrRpc-Def-olcZ.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
const EntryPointSchema = z.enum(["sell_your_work", "stage_virtually"]);
const LocationSchema = z.string().min(1).max(120);
const SessionIdSchema = z.string().min(8).max(64).regex(/^[a-zA-Z0-9_-]+$/);
const recordEntryClick = createServerFn({
  method: "POST"
}).inputValidator((d) => z.object({
  entry_point: EntryPointSchema,
  location: LocationSchema,
  session_id: SessionIdSchema,
  user_id: z.string().uuid().optional().nullable()
}).parse(d)).handler(createSsrRpc("a74e1045cd7a0f3a821081d3f8641a8989318dbb6fc03d030a49fef87723a5fb"));
const getEntryClickStats = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("4c6987d6c146ee428ebd850cb140551ad250799ad3d09ab3206687e52cd7eade"));
export {
  getEntryClickStats as g,
  recordEntryClick as r
};
