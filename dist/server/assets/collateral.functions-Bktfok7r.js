import { c as createSsrRpc } from "./createSsrRpc-Def-olcZ.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
const listMyCollateral = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("059a495d427663b3c5fa146ff82adeb161405c9cef8388029084a8a7dc7e9683"));
const requestCollateral = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  artworkId: z.string().uuid().optional().nullable(),
  title: z.string().min(2).max(200),
  appraisedValueNgn: z.number().int().positive(),
  loanAmountNgn: z.number().int().positive(),
  notes: z.string().max(2e3).optional()
}).parse(d)).handler(createSsrRpc("7f667a429c2a97a8720f156846c0f08423fb5b86046fe3c04c8232ac6ffede91"));
const adminListCollateral = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("b5556e2e9a80c929233211499a6604d994a05b26d90133806be63fcba74855a9"));
const adminUpdateCollateral = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid(),
  status: z.enum(["pending_auth", "authenticated", "active", "released", "rejected"]),
  certificateUrl: z.string().url().optional().nullable(),
  notes: z.string().max(2e3).optional().nullable()
}).parse(d)).handler(createSsrRpc("d192738bc88affc68c844d5aca1df864409bd6084c722730bf15ad7bba90a9f7"));
export {
  adminListCollateral as a,
  adminUpdateCollateral as b,
  listMyCollateral as l,
  requestCollateral as r
};
