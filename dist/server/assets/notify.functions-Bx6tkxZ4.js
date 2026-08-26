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
const assertAdmin = async (...__a) => (await import("./auth-helpers.server-DfoiTon6.js")).assertAdmin(...__a);
const MEDIA = ["oil", "watercolor", "pastel", "sculpture", "photograph", "print", "mixed_media"];
const GENDERS = ["male", "female", "other"];
const REEL_ARTWORK_COUNT = 10;
const REEL_SPONSOR_COUNT = 2;
const SPONSOR_POSITIONS = [4, 9];
const DEFAULT_MAX_FREQ = 3;
async function getMaxFreq() {
  const {
    data
  } = await (await __get_admin()).from("app_settings").select("value").eq("key", "notify_max_freq_per_week").maybeSingle();
  const v = data?.value;
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 14 ? n : DEFAULT_MAX_FREQ;
}
function ageToDob(min, max) {
  const today = /* @__PURE__ */ new Date();
  const yr = today.getUTCFullYear();
  const oldestBirth = max != null ? `${yr - max - 1}-01-01` : null;
  const newestBirth = min != null ? `${yr - min}-12-31` : null;
  return {
    oldestBirth,
    newestBirth
  };
}
const getNotifyPreferences_createServerFn_handler = createServerRpc({
  id: "ac51762fec80d3e8f4e1cd5c7dea594661870536518f4d07ee50fd91fe59392a",
  name: "getNotifyPreferences",
  filename: "src/lib/notify.functions.ts"
}, (opts) => getNotifyPreferences.__executeServer(opts));
const getNotifyPreferences = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(getNotifyPreferences_createServerFn_handler, async ({
  context
}) => {
  const max = await getMaxFreq();
  const {
    data,
    error
  } = await context.supabase.from("notify_preferences").select("*").eq("user_id", context.userId).maybeSingle();
  if (error) throw new Error(error.message);
  return {
    preferences: data ?? null,
    maxFrequencyPerWeek: max
  };
});
const PrefsIn = z.object({
  enabled: z.boolean(),
  frequency_per_week: z.number().int().min(1).max(14),
  categories: z.array(z.enum(MEDIA)).max(7),
  countries: z.array(z.string().min(1).max(64)).max(40),
  genders: z.array(z.enum(GENDERS)).max(3),
  artist_age_min: z.number().int().min(0).max(120).nullable(),
  artist_age_max: z.number().int().min(0).max(120).nullable(),
  price_min: z.number().min(0).max(1e8).nullable(),
  price_max: z.number().min(0).max(1e8).nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).default("USD")
});
const upsertNotifyPreferences_createServerFn_handler = createServerRpc({
  id: "ddf9fba802ff83dbee0427dbdf29052accf5e5857e78eee1bd18962fa36c68f2",
  name: "upsertNotifyPreferences",
  filename: "src/lib/notify.functions.ts"
}, (opts) => upsertNotifyPreferences.__executeServer(opts));
const upsertNotifyPreferences = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => PrefsIn.parse(d)).handler(upsertNotifyPreferences_createServerFn_handler, async ({
  data,
  context
}) => {
  const max = await getMaxFreq();
  const freq = Math.min(data.frequency_per_week, max);
  const patch = {
    ...data,
    frequency_per_week: freq,
    user_id: context.userId,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const {
    error
  } = await context.supabase.from("notify_preferences").upsert(patch, {
    onConflict: "user_id"
  });
  if (error) throw new Error(error.message);
  return {
    ok: true,
    frequency_per_week: freq
  };
});
const listMyReels_createServerFn_handler = createServerRpc({
  id: "bd2d313708740cb7554014d21d908e233e7d195b035e9bf1e1b1cc356a489915",
  name: "listMyReels",
  filename: "src/lib/notify.functions.ts"
}, (opts) => listMyReels.__executeServer(opts));
const listMyReels = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(listMyReels_createServerFn_handler, async ({
  context
}) => {
  const {
    data,
    error
  } = await context.supabase.from("notify_reels").select("id, status, delivered_at, viewed_at, email_sent_at, created_at").eq("user_id", context.userId).order("created_at", {
    ascending: false
  }).limit(50);
  if (error) throw new Error(error.message);
  return {
    reels: data ?? [],
    unread: (data ?? []).filter((r) => !r.viewed_at).length
  };
});
const getReel_createServerFn_handler = createServerRpc({
  id: "fc0b39049bbac09b37f649b19233047253e72b4433c52016a78bd763812200af",
  name: "getReel",
  filename: "src/lib/notify.functions.ts"
}, (opts) => getReel.__executeServer(opts));
const getReel = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(getReel_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    data: reel,
    error: rerr
  } = await context.supabase.from("notify_reels").select("*").eq("id", data.id).maybeSingle();
  if (rerr) throw new Error(rerr.message);
  if (!reel) return {
    reel: null,
    panes: []
  };
  const {
    data: panes
  } = await context.supabase.from("notify_reel_panes").select("position, kind, artwork_id, sponsor_pane_id").eq("reel_id", data.id).order("position");
  const artworkIds = (panes ?? []).filter((p) => p.artwork_id).map((p) => p.artwork_id);
  const sponsorIds = (panes ?? []).filter((p) => p.sponsor_pane_id).map((p) => p.sponsor_pane_id);
  const [{
    data: arts
  }, {
    data: sponsors
  }] = await Promise.all([artworkIds.length ? (await __get_admin()).from("artworks").select("id, short_code, title, image_url, price, currency, medium, year, artist:artists(id, short_code, name, country)").in("id", artworkIds) : Promise.resolve({
    data: []
  }), sponsorIds.length ? (await __get_admin()).from("sponsor_panes").select("id, image_url, headline, link_url").in("id", sponsorIds) : Promise.resolve({
    data: []
  })]);
  const artMap = new Map((arts ?? []).map((a) => [a.id, a]));
  const sponsorMap = new Map((sponsors ?? []).map((s) => [s.id, s]));
  const fullPanes = (panes ?? []).map((p) => ({
    position: p.position,
    kind: p.kind,
    artwork: p.kind === "artwork" ? artMap.get(p.artwork_id) ?? null : null,
    sponsor: p.kind === "sponsor" ? sponsorMap.get(p.sponsor_pane_id) ?? null : null
  }));
  return {
    reel,
    panes: fullPanes
  };
});
const markReelViewed_createServerFn_handler = createServerRpc({
  id: "95dae1b9edea2df836737b17fadd222a3e1f2cf0ba71360974ecfc5efdb57c49",
  name: "markReelViewed",
  filename: "src/lib/notify.functions.ts"
}, (opts) => markReelViewed.__executeServer(opts));
const markReelViewed = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(markReelViewed_createServerFn_handler, async ({
  data,
  context
}) => {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const {
    error
  } = await context.supabase.from("notify_reels").update({
    status: "viewed",
    viewed_at: now,
    delivered_at: now
  }).eq("id", data.id);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const markReelDelivered_createServerFn_handler = createServerRpc({
  id: "49b1fbf6df4590641cfa3db5a958b711e8d202ccba3e393b6ba3cc4e25656b79",
  name: "markReelDelivered",
  filename: "src/lib/notify.functions.ts"
}, (opts) => markReelDelivered.__executeServer(opts));
const markReelDelivered = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(markReelDelivered_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    error
  } = await context.supabase.from("notify_reels").update({
    status: "delivered",
    delivered_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", data.id).is("delivered_at", null);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const getUndeliveredReel_createServerFn_handler = createServerRpc({
  id: "5620c13726ae4c20a762ebb3a9a5196d2867dc92068a420a61438be4c476f138",
  name: "getUndeliveredReel",
  filename: "src/lib/notify.functions.ts"
}, (opts) => getUndeliveredReel.__executeServer(opts));
const getUndeliveredReel = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(getUndeliveredReel_createServerFn_handler, async ({
  context
}) => {
  const {
    data
  } = await context.supabase.from("notify_reels").select("id").eq("user_id", context.userId).is("viewed_at", null).order("created_at", {
    ascending: false
  }).limit(1).maybeSingle();
  return {
    reelId: data?.id ?? null
  };
});
async function generateReelForUser(userId) {
  const {
    data: prefs
  } = await (await __get_admin()).from("notify_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (!prefs || !prefs.enabled) return null;
  let q = (await __get_admin()).from("artworks").select("id, price, currency, medium, artist:artists!inner(id, country, gender, date_of_birth)").eq("is_active", true).eq("lifecycle_status", "in_catalogue").limit(400);
  if (prefs.categories?.length) q = q.in("medium", prefs.categories);
  if (prefs.price_min != null) q = q.gte("price", prefs.price_min);
  if (prefs.price_max != null) q = q.lte("price", prefs.price_max);
  if (prefs.countries?.length) q = q.in("artist.country", prefs.countries);
  if (prefs.genders?.length) q = q.in("artist.gender", prefs.genders);
  const {
    oldestBirth,
    newestBirth
  } = ageToDob(prefs.artist_age_min, prefs.artist_age_max);
  if (oldestBirth) q = q.gte("artist.date_of_birth", oldestBirth);
  if (newestBirth) q = q.lte("artist.date_of_birth", newestBirth);
  const {
    data: candidates
  } = await q;
  const pool = (candidates ?? []).filter((c) => c.artist);
  if (pool.length === 0) return null;
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const artworks = pool.slice(0, REEL_ARTWORK_COUNT);
  if (artworks.length === 0) return null;
  const {
    data: sp
  } = await (await __get_admin()).from("sponsor_panes").select("id, weight").eq("is_active", true);
  const sponsors = sp ?? [];
  const sponsorPicks = [];
  for (let i = 0; i < REEL_SPONSOR_COUNT; i++) {
    if (sponsors.length === 0) break;
    const totalW = sponsors.reduce((s, x) => s + Math.max(1, x.weight), 0);
    let r = Math.random() * totalW;
    let pickIdx = 0;
    for (let k = 0; k < sponsors.length; k++) {
      r -= Math.max(1, sponsors[k].weight);
      if (r <= 0) {
        pickIdx = k;
        break;
      }
    }
    sponsorPicks.push(sponsors[pickIdx].id);
    sponsors.splice(pickIdx, 1);
  }
  const panes = [];
  let artIdx = 0;
  for (let pos = 1; pos <= 12; pos++) {
    const sIdx = SPONSOR_POSITIONS.indexOf(pos);
    if (sIdx !== -1 && sponsorPicks[sIdx]) {
      panes.push({
        position: pos,
        kind: "sponsor",
        artwork_id: null,
        sponsor_pane_id: sponsorPicks[sIdx]
      });
    } else if (artIdx < artworks.length) {
      panes.push({
        position: pos,
        kind: "artwork",
        artwork_id: artworks[artIdx].id,
        sponsor_pane_id: null
      });
      artIdx++;
    }
  }
  const {
    data: reel,
    error: rerr
  } = await (await __get_admin()).from("notify_reels").insert({
    user_id: userId,
    status: "queued"
  }).select("id").single();
  if (rerr) throw new Error(rerr.message);
  const {
    error: perr
  } = await (await __get_admin()).from("notify_reel_panes").insert(panes.map((p) => ({
    ...p,
    reel_id: reel.id
  })));
  if (perr) throw new Error(perr.message);
  return reel.id;
}
const generateMyReelNow_createServerFn_handler = createServerRpc({
  id: "90215d4dfd994cf5db2581d161816a644869fa9481495ad82250ff8701528494",
  name: "generateMyReelNow",
  filename: "src/lib/notify.functions.ts"
}, (opts) => generateMyReelNow.__executeServer(opts));
const generateMyReelNow = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(generateMyReelNow_createServerFn_handler, async ({
  context
}) => {
  const id = await generateReelForUser(context.userId);
  return {
    reelId: id
  };
});
const adminListSponsorPanes_createServerFn_handler = createServerRpc({
  id: "1d516687698fbc23b53445da7684e3e1454f24de80e1162c4dae186a1bbd6854",
  name: "adminListSponsorPanes",
  filename: "src/lib/notify.functions.ts"
}, (opts) => adminListSponsorPanes.__executeServer(opts));
const adminListSponsorPanes = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(adminListSponsorPanes_createServerFn_handler, async ({
  context
}) => {
  await assertAdmin(context.userId);
  const {
    data,
    error
  } = await (await __get_admin()).from("sponsor_panes").select("*").order("sort_order").order("created_at");
  if (error) throw new Error(error.message);
  return {
    panes: data ?? []
  };
});
const SponsorIn = z.object({
  id: z.string().uuid().optional(),
  image_url: z.string().url(),
  headline: z.string().max(200).nullable().optional(),
  link_url: z.string().url().nullable().optional(),
  is_active: z.boolean().default(true),
  weight: z.number().int().min(0).max(100).default(1),
  sort_order: z.number().int().min(0).max(999).default(0)
});
const adminSaveSponsorPane_createServerFn_handler = createServerRpc({
  id: "da45cd9521206ab1743bf6933801c58b92188abaf12acb09b19bcbc791ca9f00",
  name: "adminSaveSponsorPane",
  filename: "src/lib/notify.functions.ts"
}, (opts) => adminSaveSponsorPane.__executeServer(opts));
const adminSaveSponsorPane = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => SponsorIn.parse(d)).handler(adminSaveSponsorPane_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    id,
    ...patch
  } = data;
  const q = id ? await (await __get_admin()).from("sponsor_panes").update(patch).eq("id", id).select().single() : await (await __get_admin()).from("sponsor_panes").insert(patch).select().single();
  if (q.error) throw new Error(q.error.message);
  return q.data;
});
const adminDeleteSponsorPane_createServerFn_handler = createServerRpc({
  id: "d4920153138e7f7c904edb4aaf8a8e8097dc33caf286378b41a8ef8b5fe2bcb4",
  name: "adminDeleteSponsorPane",
  filename: "src/lib/notify.functions.ts"
}, (opts) => adminDeleteSponsorPane.__executeServer(opts));
const adminDeleteSponsorPane = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(adminDeleteSponsorPane_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    error
  } = await (await __get_admin()).from("sponsor_panes").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const adminGetMaxFreq_createServerFn_handler = createServerRpc({
  id: "1a3f9d6ad1881d839deb62076c35ff73fcde86bab6a77f8bd2117c2902c510ed",
  name: "adminGetMaxFreq",
  filename: "src/lib/notify.functions.ts"
}, (opts) => adminGetMaxFreq.__executeServer(opts));
const adminGetMaxFreq = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(adminGetMaxFreq_createServerFn_handler, async ({
  context
}) => {
  await assertAdmin(context.userId);
  const value = await getMaxFreq();
  return {
    maxFrequencyPerWeek: value
  };
});
const adminSetMaxFreq_createServerFn_handler = createServerRpc({
  id: "e9b19ca77bb47b7e8271ec36a559aec04cbd6be65624e46c08e317fa0a7958de",
  name: "adminSetMaxFreq",
  filename: "src/lib/notify.functions.ts"
}, (opts) => adminSetMaxFreq.__executeServer(opts));
const adminSetMaxFreq = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  value: z.number().int().min(1).max(14)
}).parse(d)).handler(adminSetMaxFreq_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    error
  } = await (await __get_admin()).from("app_settings").upsert({
    key: "notify_max_freq_per_week",
    value: data.value,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
export {
  adminDeleteSponsorPane_createServerFn_handler,
  adminGetMaxFreq_createServerFn_handler,
  adminListSponsorPanes_createServerFn_handler,
  adminSaveSponsorPane_createServerFn_handler,
  adminSetMaxFreq_createServerFn_handler,
  generateMyReelNow_createServerFn_handler,
  getNotifyPreferences_createServerFn_handler,
  getReel_createServerFn_handler,
  getUndeliveredReel_createServerFn_handler,
  listMyReels_createServerFn_handler,
  markReelDelivered_createServerFn_handler,
  markReelViewed_createServerFn_handler,
  upsertNotifyPreferences_createServerFn_handler
};
