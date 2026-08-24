#!/usr/bin/env node
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let ok = 0,
  fail = 0;
const check = (n, c) => {
  if (c) {
    console.log("OK  ", n);
    ok++;
  } else {
    console.log("FAIL", n);
    fail++;
  }
};

const files = [
  "src/lib/auction.functions.ts",
  "src/lib/payments.functions.ts",
  "src/lib/collateral.functions.ts",
  "src/lib/escrow.functions.ts",
  "src/lib/provenance.functions.ts",
  "src/lib/content-studio.functions.ts",
  "src/lib/payments-core.server.ts",
  "src/components/admin/brokerage-admin.tsx",
  "src/routes/collateral.tsx",
  "src/routes/checkout.mock.tsx",
  "src/routes/checkout.callback.tsx",
  "src/routes/api/webhooks/paystack.ts",
  "src/routes/api/cron/auctions.ts",
  "src/routes/verify.cert.$code.tsx",
  "supabase/migrations/20260716000000_production_hardening.sql",
  "supabase/migrations/20260716000001_ship_complete.sql",
  "supabase/migrations/20260716000002_kyc_disputes.sql",
  "src/lib/kyc.functions.ts",
  "src/lib/disputes.functions.ts",
  "src/routes/verification.tsx",
  "src/routes/disputes.tsx",
  "src/components/admin/kyc-admin.tsx",
  "src/components/admin/disputes-admin.tsx",
];
for (const f of files) check(f, existsSync(join(root, f)));

const mig = readFileSync(
  join(root, "supabase/migrations/20260716000000_production_hardening.sql"),
  "utf8",
);
check("payments table", mig.includes("payments"));
check("collateral_pledges", mig.includes("collateral_pledges"));
check("auction seeds", mig.includes("auction_lots"));

const mig2 = readFileSync(
  join(root, "supabase/migrations/20260716000001_ship_complete.sql"),
  "utf8",
);
check("escrow_holds", mig2.includes("escrow_holds"));
check("certificate_registry", mig2.includes("certificate_registry"));
check("fulfill_payment_record", mig2.includes("fulfill_payment_record"));

const auction = readFileSync(join(root, "src/routes/auction.tsx"), "utf8");
check("auction uses listAuctionLots", auction.includes("listAuctionLots"));
check("auction uses placeAuctionBid", auction.includes("placeAuctionBid"));
check("no SEED lots", !auction.includes("const SEED"));

const piece = readFileSync(join(root, "src/routes/piece.$code.tsx"), "utf8");
check("piece buy now", piece.includes("initializePayment"));
check("piece collateral link", piece.includes("/collateral"));
check("piece pledged guard", piece.includes("is_pledged"));

const admin = readFileSync(join(root, "src/routes/admin.tsx"), "utf8");
check("admin brokerage tab", admin.includes("BrokerageAdmin"));

const pay = readFileSync(join(root, "src/lib/payments.functions.ts"), "utf8");
check("payments RPC fulfill", pay.includes("fulfill_payment_record"));

const cs = readFileSync(join(root, "src/components/content-studio.tsx"), "utf8");
check("content studio server persist", cs.includes("publishSiteContent"));

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
