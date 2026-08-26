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
async function isAdmin(userId) {
  const {
    data
  } = await (await __get_admin()).from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}
async function assertAdmin(userId) {
  if (!await isAdmin(userId)) throw new Error("Forbidden: admin only");
}
async function getFeePercent() {
  const {
    data
  } = await (await __get_admin()).from("app_settings").select("value").eq("key", "broker_fee_percent").maybeSingle();
  const raw = data?.value;
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : 5;
  return Number.isFinite(n) ? n : 5;
}
const listListings_createServerFn_handler = createServerRpc({
  id: "507a1815cae79c275a4e7c96eb0d2523917ce2ac34e171ff00e6237b7a5d402f",
  name: "listListings",
  filename: "src/lib/lounge.functions.ts"
}, (opts) => listListings.__executeServer(opts));
const listListings = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  type: z.enum(["sell", "buy", "all"]).default("all")
}).parse(d ?? {})).handler(listListings_createServerFn_handler, async ({
  data,
  context
}) => {
  let q = context.supabase.from("listings").select("id, member_id, type, title, medium, price, currency, notes, image_url, status, created_at").eq("status", "open").order("created_at", {
    ascending: false
  }).limit(200);
  if (data.type !== "all") q = q.eq("type", data.type);
  const {
    data: rows,
    error
  } = await q;
  if (error) throw new Error(error.message);
  const ids = Array.from(new Set((rows ?? []).map((r) => r.member_id)));
  const {
    data: profs
  } = ids.length ? await (await __get_admin()).from("profiles").select("id, display_name").in("id", ids) : {
    data: []
  };
  const nameById = new Map((profs ?? []).map((p) => [p.id, p.display_name]));
  return (rows ?? []).map((r) => ({
    ...r,
    member_name: nameById.get(r.member_id) ?? "Member"
  }));
});
const createListing_createServerFn_handler = createServerRpc({
  id: "891795fd46637d6484bf6b02f5190f8a2eb24e2a32dcff87a444a644cda673c4",
  name: "createListing",
  filename: "src/lib/lounge.functions.ts"
}, (opts) => createListing.__executeServer(opts));
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
}).parse(d)).handler(createListing_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    error,
    data: row
  } = await context.supabase.from("listings").insert({
    ...data,
    member_id: context.userId
  }).select("id").single();
  if (error) throw new Error(error.message);
  return {
    id: row.id
  };
});
const closeListing_createServerFn_handler = createServerRpc({
  id: "15b50e9d9b6d0f4f49c742be44f73b31bcaa45f10e7729660bc2658f9aff65be",
  name: "closeListing",
  filename: "src/lib/lounge.functions.ts"
}, (opts) => closeListing.__executeServer(opts));
const closeListing = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(closeListing_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    error
  } = await context.supabase.from("listings").update({
    status: "closed"
  }).eq("id", data.id);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const openThread_createServerFn_handler = createServerRpc({
  id: "455203d26771d23bcd194b2f5b36d8534ec9078dcb03ce14e361a28e4fa78a7c",
  name: "openThread",
  filename: "src/lib/lounge.functions.ts"
}, (opts) => openThread.__executeServer(opts));
const openThread = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  listing_id: z.string().uuid()
}).parse(d)).handler(openThread_createServerFn_handler, async ({
  data,
  context
}) => {
  const userId = context.userId;
  const {
    data: listing,
    error: lerr
  } = await (await __get_admin()).from("listings").select("id, member_id, type").eq("id", data.listing_id).single();
  if (lerr || !listing) throw new Error("Listing not found");
  if (listing.member_id === userId) throw new Error("You own this listing");
  const seller_id = listing.type === "sell" ? listing.member_id : userId;
  const buyer_id = listing.type === "sell" ? userId : listing.member_id;
  const {
    data: existing
  } = await (await __get_admin()).from("threads").select("id").eq("listing_id", listing.id).eq("buyer_id", buyer_id).eq("seller_id", seller_id).maybeSingle();
  if (existing) return {
    id: existing.id
  };
  const {
    data: row,
    error
  } = await (await __get_admin()).from("threads").insert({
    listing_id: listing.id,
    buyer_id,
    seller_id
  }).select("id").single();
  if (error) throw new Error(error.message);
  return {
    id: row.id
  };
});
const listMyThreads_createServerFn_handler = createServerRpc({
  id: "f86be2850f7c20b2071bf97192a559ce755cd19e5de892e7de30bba1dd8c59ab",
  name: "listMyThreads",
  filename: "src/lib/lounge.functions.ts"
}, (opts) => listMyThreads.__executeServer(opts));
const listMyThreads = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(listMyThreads_createServerFn_handler, async ({
  context
}) => {
  const userId = context.userId;
  const {
    data: threads,
    error
  } = await context.supabase.from("threads").select("id, listing_id, buyer_id, seller_id, last_message_at, created_at").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order("last_message_at", {
    ascending: false
  }).limit(100);
  if (error) throw new Error(error.message);
  const listingIds = Array.from(new Set((threads ?? []).map((t) => t.listing_id)));
  const otherIds = Array.from(new Set((threads ?? []).map((t) => t.buyer_id === userId ? t.seller_id : t.buyer_id)));
  const [{
    data: listings
  }, {
    data: profs
  }] = await Promise.all([listingIds.length ? (await __get_admin()).from("listings").select("id, title, type, price, currency").in("id", listingIds) : Promise.resolve({
    data: []
  }), otherIds.length ? (await __get_admin()).from("profiles").select("id, display_name").in("id", otherIds) : Promise.resolve({
    data: []
  })]);
  const listingMap = new Map((listings ?? []).map((l) => [l.id, l]));
  const nameMap = new Map((profs ?? []).map((p) => [p.id, p.display_name]));
  return (threads ?? []).map((t) => {
    const otherId = t.buyer_id === userId ? t.seller_id : t.buyer_id;
    return {
      ...t,
      listing: listingMap.get(t.listing_id) ?? null,
      other_name: nameMap.get(otherId) ?? "Member",
      you_are: t.buyer_id === userId ? "buyer" : "seller"
    };
  });
});
const getThread_createServerFn_handler = createServerRpc({
  id: "b615467d437abb11d9f543b5676ddd740af6a54567e2d22e73d9f7f901979d0a",
  name: "getThread",
  filename: "src/lib/lounge.functions.ts"
}, (opts) => getThread.__executeServer(opts));
const getThread = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  thread_id: z.string().uuid()
}).parse(d)).handler(getThread_createServerFn_handler, async ({
  data,
  context
}) => {
  const userId = context.userId;
  const {
    data: thread,
    error
  } = await context.supabase.from("threads").select("id, listing_id, buyer_id, seller_id").eq("id", data.thread_id).single();
  if (error || !thread) throw new Error("Thread not found");
  const [{
    data: messages
  }, {
    data: listing
  }, {
    data: broker
  }] = await Promise.all([context.supabase.from("messages").select("id, sender_id, body, created_at").eq("thread_id", thread.id).order("created_at", {
    ascending: true
  }).limit(500), (await __get_admin()).from("listings").select("id, title, type, price, currency, medium, notes, image_url, member_id").eq("id", thread.listing_id).maybeSingle(), (await __get_admin()).from("broker_requests").select("*").eq("thread_id", thread.id).order("created_at", {
    ascending: false
  }).maybeSingle()]);
  const otherId = thread.buyer_id === userId ? thread.seller_id : thread.buyer_id;
  const {
    data: prof
  } = await (await __get_admin()).from("profiles").select("display_name").eq("id", otherId).maybeSingle();
  return {
    thread: {
      ...thread,
      you_are: thread.buyer_id === userId ? "buyer" : "seller"
    },
    messages: messages ?? [],
    listing,
    broker_request: broker ?? null,
    other_name: prof?.display_name ?? "Member"
  };
});
const sendMessage_createServerFn_handler = createServerRpc({
  id: "2718394b00e00907f37466b333cb7216e7107bb8d84c2c0a58f922be503e7a4d",
  name: "sendMessage",
  filename: "src/lib/lounge.functions.ts"
}, (opts) => sendMessage.__executeServer(opts));
const sendMessage = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  thread_id: z.string().uuid(),
  body: z.string().min(1).max(4e3)
}).parse(d)).handler(sendMessage_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    error
  } = await context.supabase.from("messages").insert({
    thread_id: data.thread_id,
    sender_id: context.userId,
    body: data.body
  });
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const requestBrokerage_createServerFn_handler = createServerRpc({
  id: "b5aa079eafad6ba9b2263b2f709f813da277b3d82c46a5e1332e595b8d307f05",
  name: "requestBrokerage",
  filename: "src/lib/lounge.functions.ts"
}, (opts) => requestBrokerage.__executeServer(opts));
const requestBrokerage = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  thread_id: z.string().uuid(),
  transaction_amount: z.number().positive(),
  currency: z.string().min(3).max(8).default("USD")
}).parse(d)).handler(requestBrokerage_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    data: thread,
    error: terr
  } = await (await __get_admin()).from("threads").select("id, listing_id, buyer_id, seller_id").eq("id", data.thread_id).single();
  if (terr || !thread) throw new Error("Thread not found");
  if (thread.buyer_id !== context.userId && thread.seller_id !== context.userId) {
    throw new Error("Forbidden");
  }
  const feePct = await getFeePercent();
  const feeAmount = Math.round(data.transaction_amount * feePct) / 100;
  const {
    data: existing
  } = await (await __get_admin()).from("broker_requests").select("id, status").eq("thread_id", thread.id).order("created_at", {
    ascending: false
  }).maybeSingle();
  if (existing && !["rejected", "closed"].includes(existing.status)) {
    throw new Error("A brokerage request is already in progress for this thread.");
  }
  const {
    data: row,
    error
  } = await (await __get_admin()).from("broker_requests").insert({
    thread_id: thread.id,
    listing_id: thread.listing_id,
    requester_id: context.userId,
    status: "requested",
    fee_percent: feePct,
    transaction_amount: data.transaction_amount,
    fee_amount: feeAmount,
    currency: data.currency
  }).select("id").single();
  if (error) throw new Error(error.message);
  return {
    id: row.id
  };
});
const adminListBrokerRequests_createServerFn_handler = createServerRpc({
  id: "0802c0ee3dd980359e82fb21bf16b91eb01adf61fdd5fab168ea750197725cb6",
  name: "adminListBrokerRequests",
  filename: "src/lib/lounge.functions.ts"
}, (opts) => adminListBrokerRequests.__executeServer(opts));
const adminListBrokerRequests = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(adminListBrokerRequests_createServerFn_handler, async ({
  context
}) => {
  await assertAdmin(context.userId);
  const {
    data,
    error
  } = await (await __get_admin()).from("broker_requests").select("*").order("created_at", {
    ascending: false
  }).limit(200);
  if (error) throw new Error(error.message);
  const tids = Array.from(new Set((data ?? []).map((r) => r.thread_id)));
  const {
    data: threads
  } = tids.length ? await (await __get_admin()).from("threads").select("id, buyer_id, seller_id, listing_id").in("id", tids) : {
    data: []
  };
  const threadRows = threads ?? [];
  const lids = Array.from(new Set(threadRows.map((t) => t.listing_id)));
  const uids = Array.from(new Set(threadRows.flatMap((t) => [t.buyer_id, t.seller_id])));
  const [{
    data: listings
  }, {
    data: profs
  }] = await Promise.all([lids.length ? (await __get_admin()).from("listings").select("id, title").in("id", lids) : Promise.resolve({
    data: []
  }), uids.length ? (await __get_admin()).from("profiles").select("id, display_name").in("id", uids) : Promise.resolve({
    data: []
  })]);
  const tMap = new Map(threadRows.map((t) => [t.id, t]));
  const lMap = new Map((listings ?? []).map((l) => [l.id, l]));
  const pMap = new Map((profs ?? []).map((p) => [p.id, p.display_name]));
  return (data ?? []).map((r) => {
    const t = tMap.get(r.thread_id);
    return {
      ...r,
      listing_title: lMap.get(r.listing_id)?.title ?? "(unknown)",
      buyer_name: t ? pMap.get(t.buyer_id) ?? "Member" : "",
      seller_name: t ? pMap.get(t.seller_id) ?? "Member" : ""
    };
  });
});
const adminUpdateBrokerRequest_createServerFn_handler = createServerRpc({
  id: "d7795f623f75d6dbe033d631b6529e413cce189e3a1f73f10fef71c39796c831",
  name: "adminUpdateBrokerRequest",
  filename: "src/lib/lounge.functions.ts"
}, (opts) => adminUpdateBrokerRequest.__executeServer(opts));
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
}).parse(d)).handler(adminUpdateBrokerRequest_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    id,
    transaction_amount,
    ...rest
  } = data;
  const patch = {
    ...rest
  };
  if (transaction_amount !== void 0) {
    const {
      data: cur
    } = await (await __get_admin()).from("broker_requests").select("fee_percent").eq("id", id).single();
    const pct = Number(cur?.fee_percent ?? await getFeePercent());
    patch.transaction_amount = transaction_amount;
    patch.fee_amount = Math.round(transaction_amount * pct) / 100;
  }
  Object.keys(patch).forEach((k) => patch[k] === void 0 && delete patch[k]);
  const {
    error
  } = await (await __get_admin()).from("broker_requests").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const adminIssueCertificate_createServerFn_handler = createServerRpc({
  id: "baaab8bbd5f0f2a8a61954cbfa14f7b8c9b484157c45e17a93dfeafc9c053ea5",
  name: "adminIssueCertificate",
  filename: "src/lib/lounge.functions.ts"
}, (opts) => adminIssueCertificate.__executeServer(opts));
const adminIssueCertificate = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(adminIssueCertificate_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    data: req,
    error
  } = await (await __get_admin()).from("broker_requests").select("*").eq("id", data.id).single();
  if (error || !req) throw new Error("Request not found");
  const {
    data: listing
  } = await (await __get_admin()).from("listings").select("title, medium").eq("id", req.listing_id).maybeSingle();
  const {
    data: thread
  } = await (await __get_admin()).from("threads").select("buyer_id, seller_id").eq("id", req.thread_id).single();
  const {
    data: profs
  } = await (await __get_admin()).from("profiles").select("id, display_name").in("id", [thread.buyer_id, thread.seller_id]);
  const nameMap = new Map((profs ?? []).map((p) => [p.id, p.display_name ?? "Member"]));
  const {
    PDFDocument,
    StandardFonts,
    rgb
  } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const draw = (text, x, y, size = 12, bold = false) => page.drawText(text, {
    x,
    y,
    size,
    font: bold ? titleFont : bodyFont,
    color: rgb(0.1, 0.1, 0.1)
  });
  page.drawRectangle({
    x: 30,
    y: 30,
    width: 535,
    height: 782,
    borderColor: rgb(0.65, 0.5, 0.15),
    borderWidth: 2
  });
  draw("CERTIFICATE OF AUTHENTICITY", 90, 760, 22, true);
  draw("MyAfriart Brokerage Service", 90, 735, 12);
  draw(`Reference: ${req.id}`, 60, 690, 10);
  draw(`Issued: ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`, 60, 670, 10);
  draw("Work", 60, 630, 14, true);
  draw(`Title: ${listing?.title ?? "(untitled)"}`, 60, 610, 12);
  if (listing?.medium) draw(`Medium: ${listing.medium}`, 60, 592, 12);
  draw("Parties", 60, 555, 14, true);
  draw(`Seller: ${nameMap.get(thread.seller_id)}`, 60, 535, 12);
  draw(`Buyer:  ${nameMap.get(thread.buyer_id)}`, 60, 517, 12);
  draw("Verification", 60, 480, 14, true);
  draw(`Verifier: ${req.verifier_name ?? "—"}`, 60, 460, 12);
  if (req.verification_notes) {
    const lines = String(req.verification_notes).match(/.{1,80}/g) ?? [];
    lines.slice(0, 6).forEach((ln, i) => draw(ln, 60, 442 - i * 16, 11));
  }
  draw("Transaction", 60, 340, 14, true);
  draw(`Amount: ${req.currency} ${Number(req.transaction_amount ?? 0).toFixed(2)}`, 60, 320, 12);
  draw(`Broker fee (${Number(req.fee_percent ?? 0)}%): ${req.currency} ${Number(req.fee_amount ?? 0).toFixed(2)}`, 60, 302, 12);
  draw(`Delivery: ${req.delivered_at ? new Date(req.delivered_at).toISOString().slice(0, 10) : "—"}`, 60, 284, 12);
  if (req.carrier) draw(`Carrier: ${req.carrier} (${req.tracking_ref ?? ""})`, 60, 266, 11);
  draw("MyAfriart certifies that the work described above has been independently", 60, 150, 10);
  draw("verified and the transaction monitored under our brokerage service.", 60, 136, 10);
  const bytes = await pdf.save();
  const path = `certificates/${req.id}.pdf`;
  const {
    error: upErr
  } = await (await __get_admin()).storage.from("artworks").upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true
  });
  if (upErr) throw new Error(upErr.message);
  const {
    data: pub
  } = (await __get_admin()).storage.from("artworks").getPublicUrl(path);
  const url = pub.publicUrl;
  const {
    data: verifyCode,
    error: regErr
  } = await (await __get_admin()).rpc("register_certificate", {
    p_broker_id: req.id,
    p_title: listing?.title ?? "Untitled",
    p_artist: listing?.medium ?? "",
    p_owner: nameMap.get(thread.buyer_id) ?? "Buyer",
    p_url: url,
    p_artwork_id: null
  });
  if (regErr) throw new Error(regErr.message);
  return {
    url,
    verifyCode
  };
});
const getBrokerFee_createServerFn_handler = createServerRpc({
  id: "06b1f2e3b1b3795e6c2b1a3e596b45db18ecbb180515a1a539ba50479798220c",
  name: "getBrokerFee",
  filename: "src/lib/lounge.functions.ts"
}, (opts) => getBrokerFee.__executeServer(opts));
const getBrokerFee = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(getBrokerFee_createServerFn_handler, async () => {
  return {
    fee_percent: await getFeePercent()
  };
});
const setBrokerFee_createServerFn_handler = createServerRpc({
  id: "707962ab7c68499da7045d73a6353a7d3e5e4e2793bd93e19c363fbcdf8fbc56",
  name: "setBrokerFee",
  filename: "src/lib/lounge.functions.ts"
}, (opts) => setBrokerFee.__executeServer(opts));
const setBrokerFee = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  fee_percent: z.number().min(0).max(25)
}).parse(d)).handler(setBrokerFee_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    error
  } = await (await __get_admin()).from("app_settings").upsert({
    key: "broker_fee_percent",
    value: data.fee_percent,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
export {
  adminIssueCertificate_createServerFn_handler,
  adminListBrokerRequests_createServerFn_handler,
  adminUpdateBrokerRequest_createServerFn_handler,
  closeListing_createServerFn_handler,
  createListing_createServerFn_handler,
  getBrokerFee_createServerFn_handler,
  getThread_createServerFn_handler,
  listListings_createServerFn_handler,
  listMyThreads_createServerFn_handler,
  openThread_createServerFn_handler,
  requestBrokerage_createServerFn_handler,
  sendMessage_createServerFn_handler,
  setBrokerFee_createServerFn_handler
};
