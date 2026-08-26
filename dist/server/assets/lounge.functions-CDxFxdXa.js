import { c as createSsrRpc } from "./createSsrRpc-Def-olcZ.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
const listListings = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  type: z.enum(["sell", "buy", "all"]).default("all")
}).parse(d ?? {})).handler(createSsrRpc("507a1815cae79c275a4e7c96eb0d2523917ce2ac34e171ff00e6237b7a5d402f"));
const createListing = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  type: z.enum(["sell", "buy"]),
  title: z.string().min(1).max(200),
  medium: z.string().max(100).optional().nullable(),
  price: z.number().nonnegative().optional().nullable(),
  currency: z.string().min(3).max(8).default("USD"),
  notes: z.string().max(2e3).optional().nullable(),
  image_url: z.string().url().optional().nullable()
}).parse(d)).handler(createSsrRpc("891795fd46637d6484bf6b02f5190f8a2eb24e2a32dcff87a444a644cda673c4"));
const closeListing = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(createSsrRpc("15b50e9d9b6d0f4f49c742be44f73b31bcaa45f10e7729660bc2658f9aff65be"));
const openThread = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  listing_id: z.string().uuid()
}).parse(d)).handler(createSsrRpc("455203d26771d23bcd194b2f5b36d8534ec9078dcb03ce14e361a28e4fa78a7c"));
const listMyThreads = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("f86be2850f7c20b2071bf97192a559ce755cd19e5de892e7de30bba1dd8c59ab"));
const getThread = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  thread_id: z.string().uuid()
}).parse(d)).handler(createSsrRpc("b615467d437abb11d9f543b5676ddd740af6a54567e2d22e73d9f7f901979d0a"));
const sendMessage = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  thread_id: z.string().uuid(),
  body: z.string().min(1).max(4e3)
}).parse(d)).handler(createSsrRpc("2718394b00e00907f37466b333cb7216e7107bb8d84c2c0a58f922be503e7a4d"));
const requestBrokerage = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  thread_id: z.string().uuid(),
  transaction_amount: z.number().positive(),
  currency: z.string().min(3).max(8).default("USD")
}).parse(d)).handler(createSsrRpc("b5aa079eafad6ba9b2263b2f709f813da277b3d82c46a5e1332e595b8d307f05"));
const adminListBrokerRequests = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("0802c0ee3dd980359e82fb21bf16b91eb01adf61fdd5fab168ea750197725cb6"));
const adminUpdateBrokerRequest = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid(),
  status: z.enum(["requested", "accepted", "rejected", "verified", "in_transit", "delivered", "certified", "closed"]).optional(),
  verifier_name: z.string().max(200).optional().nullable(),
  verification_notes: z.string().max(2e3).optional().nullable(),
  carrier: z.string().max(200).optional().nullable(),
  tracking_ref: z.string().max(200).optional().nullable(),
  delivered_at: z.string().optional().nullable(),
  delivery_notes: z.string().max(2e3).optional().nullable(),
  admin_notes: z.string().max(2e3).optional().nullable(),
  transaction_amount: z.number().positive().optional()
}).parse(d)).handler(createSsrRpc("d7795f623f75d6dbe033d631b6529e413cce189e3a1f73f10fef71c39796c831"));
const adminIssueCertificate = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(createSsrRpc("baaab8bbd5f0f2a8a61954cbfa14f7b8c9b484157c45e17a93dfeafc9c053ea5"));
const getBrokerFee = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("06b1f2e3b1b3795e6c2b1a3e596b45db18ecbb180515a1a539ba50479798220c"));
createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  fee_percent: z.number().min(0).max(25)
}).parse(d)).handler(createSsrRpc("707962ab7c68499da7045d73a6353a7d3e5e4e2793bd93e19c363fbcdf8fbc56"));
export {
  listMyThreads as a,
  getBrokerFee as b,
  closeListing as c,
  createListing as d,
  adminListBrokerRequests as e,
  adminUpdateBrokerRequest as f,
  getThread as g,
  adminIssueCertificate as h,
  listListings as l,
  openThread as o,
  requestBrokerage as r,
  sendMessage as s
};
