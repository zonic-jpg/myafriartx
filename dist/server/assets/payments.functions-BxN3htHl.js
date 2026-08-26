import { c as createSsrRpc } from "./createSsrRpc-Def-olcZ.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
const initializePayment = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  purpose: z.enum(["artwork_purchase", "auction_settlement", "brokerage_fee", "collateral_fee"]),
  amountNgn: z.number().int().positive(),
  metadata: z.record(z.string()).default({})
}).parse(d)).handler(createSsrRpc("b44a2a708e34d985bbe7c9b88fa9af13197d85c69a3e6ff180cec2998dc1ac5e"));
const verifyPayment = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  reference: z.string().min(3)
}).parse(d)).handler(createSsrRpc("3082e488c4a8779ced42ff7d7eb0cb04aaf3c1cba345399c512c9e4e1bae4239"));
export {
  initializePayment as i,
  verifyPayment as v
};
