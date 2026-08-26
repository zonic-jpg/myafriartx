import { c as createSsrRpc } from "./createSsrRpc-Def-olcZ.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
const listMyDisputablePayments = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("691d8f25fa9e6694f0e5ec065385e55b62e779db4e7252263cd9258ae0001aae"));
const openDispute = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  paymentId: z.string().uuid(),
  reason: z.string().min(20, "Describe the problem in at least 20 characters").max(2e3)
}).parse(d)).handler(createSsrRpc("8092e2690a17ade13077a2945c0041846b453dc669583aa44ec2dd0ff51090ec"));
const adminListDisputes = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  status: z.enum(["open", "resolved", "rejected", "all"]).default("open")
}).parse(d ?? {})).handler(createSsrRpc("142f58e9f0d4965cfdfa59317517bb05c69c3326a04cacf1b71b9e91506b7111"));
const adminResolveDispute = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  disputeId: z.string().uuid(),
  outcome: z.enum(["resolved", "rejected"]),
  resolution: z.string().min(10).max(2e3),
  refundEscrow: z.boolean().default(false)
}).parse(d)).handler(createSsrRpc("03b566348d3135a1bedc1261a2bac3247c5516194ff68da4b305c179e69dc056"));
export {
  adminListDisputes as a,
  adminResolveDispute as b,
  listMyDisputablePayments as l,
  openDispute as o
};
