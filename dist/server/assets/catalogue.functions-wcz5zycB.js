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
const CATALOGUE_CAP = 40;
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function applyAllocation(pool, allocations, cap) {
  const present = allocations.filter((a) => (pool[a.country]?.length ?? 0) > 0 && a.percent > 0);
  const totalPct = present.reduce((sum, a) => sum + a.percent, 0);
  if (!present.length || totalPct === 0) {
    const all = Object.values(pool).flat();
    return shuffle(all).slice(0, cap);
  }
  const quotas = present.map((a) => ({
    country: a.country,
    quota: Math.floor(a.percent / totalPct * cap)
  }));
  const used = quotas.reduce((s, q) => s + q.quota, 0);
  let remainder = cap - used;
  const remainders = present.map((a, i) => ({
    i,
    frac: a.percent / totalPct * cap - quotas[i].quota
  })).sort((x, y) => y.frac - x.frac);
  for (let k = 0; k < remainders.length && remainder > 0; k++) {
    quotas[remainders[k].i].quota += 1;
    remainder--;
  }
  const out = [];
  const leftovers = [];
  for (const q of quotas) {
    const bucket = shuffle(pool[q.country] ?? []);
    out.push(...bucket.slice(0, q.quota));
    leftovers.push(...bucket.slice(q.quota));
  }
  if (out.length < cap) {
    out.push(...shuffle(leftovers).slice(0, cap - out.length));
  }
  return out.slice(0, cap);
}
const getCataloguePieces_createServerFn_handler = createServerRpc({
  id: "96fcaa13b2dd3b04931964447359b37bdfd873119a1654659dd33d9fa3fcc061",
  name: "getCataloguePieces",
  filename: "src/lib/catalogue.functions.ts"
}, (opts) => getCataloguePieces.__executeServer(opts));
const getCataloguePieces = createServerFn({
  method: "GET"
}).handler(getCataloguePieces_createServerFn_handler, async () => {
  const {
    data: settings
  } = await (await __get_admin()).from("app_settings").select("value").eq("key", "mock_catalogue_enabled").maybeSingle();
  const source = (typeof settings?.value === "boolean" ? settings.value : true) ? "mock" : "live";
  const [{
    data: alloc
  }, {
    data: rows
  }] = await Promise.all([(await __get_admin()).from("catalogue_allocations_pieces").select("country, percent"), (await __get_admin()).from("artworks").select("id, short_code, title, medium, year, image_url, price, currency, lifecycle_status, view_count, content_source, created_at, artist:artists!inner(id, short_code, name, country, gender, domicile_city, date_of_birth)").eq("is_active", true).eq("lifecycle_status", "in_catalogue").eq("content_source", source).order("created_at", {
    ascending: false
  }).limit(500)]);
  const items = rows ?? [];
  const pool = {};
  for (const item of items) {
    const country = item.artist?.country ?? "Unknown";
    (pool[country] ??= []).push(item);
  }
  return {
    pieces: applyAllocation(pool, alloc ?? [], CATALOGUE_CAP),
    totalAvailable: items.length
  };
});
const getCatalogueArtists_createServerFn_handler = createServerRpc({
  id: "d110404b12abf8c9c8c248f119dd1a4fa5267b762279af9a2f17c47e77d9cb39",
  name: "getCatalogueArtists",
  filename: "src/lib/catalogue.functions.ts"
}, (opts) => getCatalogueArtists.__executeServer(opts));
const getCatalogueArtists = createServerFn({
  method: "GET"
}).handler(getCatalogueArtists_createServerFn_handler, async () => {
  const {
    data: settings
  } = await (await __get_admin()).from("app_settings").select("value").eq("key", "mock_catalogue_enabled").maybeSingle();
  const source = (typeof settings?.value === "boolean" ? settings.value : true) ? "mock" : "live";
  const [{
    data: alloc
  }, {
    data: rows
  }] = await Promise.all([(await __get_admin()).from("catalogue_allocations_artists").select("country, percent"), (await __get_admin()).from("artists").select("id, short_code, name, country, gender, domicile_city, date_of_birth, portrait_url, view_count, content_source, created_at").eq("content_source", source).order("created_at", {
    ascending: false
  }).limit(500)]);
  const items = rows ?? [];
  const pool = {};
  for (const item of items) {
    const country = item.country ?? "Unknown";
    (pool[country] ??= []).push(item);
  }
  return {
    artists: applyAllocation(pool, alloc ?? [], CATALOGUE_CAP),
    totalAvailable: items.length
  };
});
const idSchema = z.object({
  idOrCode: z.string().min(1).max(64)
});
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const matchKey = (s) => UUID_RE.test(s) ? "id" : "short_code";
const getPieceDetail_createServerFn_handler = createServerRpc({
  id: "c4e251dfa035685675fa525d14ba8e1a887e55c2f8a148ad7c168896a2232981",
  name: "getPieceDetail",
  filename: "src/lib/catalogue.functions.ts"
}, (opts) => getPieceDetail.__executeServer(opts));
const getPieceDetail = createServerFn({
  method: "GET"
}).inputValidator((d) => idSchema.parse(d)).handler(getPieceDetail_createServerFn_handler, async ({
  data
}) => {
  const {
    getMockPiece,
    isMockCatalogueCode
  } = await import("./mock-catalogue-C_lZKJ3J.js");
  if (isMockCatalogueCode(data.idOrCode)) {
    const mock2 = getMockPiece(data.idOrCode);
    if (mock2) return {
      piece: mock2
    };
  }
  try {
    const key = matchKey(data.idOrCode);
    const {
      data: piece
    } = await (await __get_admin()).from("artworks").select("id, short_code, title, medium, year, image_url, price, currency, lifecycle_status, view_count, description, dominant_palette, default_frame, content_source, is_active, is_pledged, created_at, updated_at, artist:artists(id, short_code, name, country, gender, domicile_city, date_of_birth, portrait_url, bio)").eq(key, data.idOrCode).maybeSingle();
    if (piece) return {
      piece
    };
  } catch {
  }
  const mock = getMockPiece(data.idOrCode);
  return {
    piece: mock
  };
});
const getArtistDetail_createServerFn_handler = createServerRpc({
  id: "b0d4c5f64d41298cb40a00b78d349bacd032bfac4401e11ded0d11b093966809",
  name: "getArtistDetail",
  filename: "src/lib/catalogue.functions.ts"
}, (opts) => getArtistDetail.__executeServer(opts));
const getArtistDetail = createServerFn({
  method: "GET"
}).inputValidator((d) => idSchema.parse(d)).handler(getArtistDetail_createServerFn_handler, async ({
  data
}) => {
  const {
    getMockArtist,
    isMockCatalogueCode
  } = await import("./mock-catalogue-C_lZKJ3J.js");
  if (isMockCatalogueCode(data.idOrCode)) {
    const mock2 = getMockArtist(data.idOrCode);
    if (mock2) return mock2;
  }
  try {
    const key = matchKey(data.idOrCode);
    const {
      data: artist
    } = await (await __get_admin()).from("artists").select("id, short_code, name, country, gender, domicile_city, date_of_birth, portrait_url, bio, era, alma_mater, view_count, created_at, updated_at").eq(key, data.idOrCode).maybeSingle();
    if (artist) {
      const {
        data: works
      } = await (await __get_admin()).from("artworks").select("id, short_code, title, medium, year, image_url, price, currency, lifecycle_status, view_count, created_at").eq("artist_id", artist.id).order("created_at", {
        ascending: false
      });
      return {
        artist,
        works: works ?? []
      };
    }
  } catch {
  }
  const mock = getMockArtist(data.idOrCode);
  return mock ?? {
    artist: null,
    works: []
  };
});
const bumpView_createServerFn_handler = createServerRpc({
  id: "62a8ed3c6ea987317348157b711a00d954cf9b80c71c82f46e2e8ec493281ef8",
  name: "bumpView",
  filename: "src/lib/catalogue.functions.ts"
}, (opts) => bumpView.__executeServer(opts));
const bumpView = createServerFn({
  method: "POST"
}).inputValidator((d) => z.object({
  target: z.enum(["artworks", "artists"]),
  id: z.string().uuid()
}).parse(d)).handler(bumpView_createServerFn_handler, async ({
  data
}) => {
  const {
    error
  } = await (await __get_admin()).rpc("increment_view", {
    target_table: data.target,
    target_id: data.id
  });
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const scopeSchema = z.enum(["pieces", "artists"]);
const tableFor = (scope) => scope === "pieces" ? "catalogue_allocations_pieces" : "catalogue_allocations_artists";
const getAllocations_createServerFn_handler = createServerRpc({
  id: "a1a8c571f3323150fb6e138244c77467a80e0502f52e30a30c1bd92b0328a241",
  name: "getAllocations",
  filename: "src/lib/catalogue.functions.ts"
}, (opts) => getAllocations.__executeServer(opts));
const getAllocations = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  scope: scopeSchema
}).parse(d)).handler(getAllocations_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    data: rows,
    error
  } = await (await __get_admin()).from(tableFor(data.scope)).select("country, percent").order("country");
  if (error) throw new Error(error.message);
  return {
    rows: rows ?? []
  };
});
const saveAllocations_createServerFn_handler = createServerRpc({
  id: "afbf60c126d74fb0ab4c4b90ddec4c72ed61c2cfc117e13875324bf693adaa77",
  name: "saveAllocations",
  filename: "src/lib/catalogue.functions.ts"
}, (opts) => saveAllocations.__executeServer(opts));
const saveAllocations = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  scope: scopeSchema,
  rows: z.array(z.object({
    country: z.string().min(1).max(64),
    percent: z.number().min(0).max(100)
  })).max(80)
}).parse(d)).handler(saveAllocations_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const total = data.rows.reduce((s, r) => s + r.percent, 0);
  if (data.rows.length > 0 && Math.round(total) !== 100) {
    throw new Error(`Allocations must sum to 100% (got ${total.toFixed(1)}%).`);
  }
  const table = tableFor(data.scope);
  await (await __get_admin()).from(table).delete().not("country", "is", null);
  if (data.rows.length > 0) {
    const {
      error
    } = await (await __get_admin()).from(table).insert(data.rows.map((r) => ({
      country: r.country,
      percent: r.percent
    })));
    if (error) throw new Error(error.message);
  }
  return {
    ok: true
  };
});
const lookupById_createServerFn_handler = createServerRpc({
  id: "e87cf7d1c12aea0e1af617dd6906531df73c6e76373945a75bc22c862fe585b0",
  name: "lookupById",
  filename: "src/lib/catalogue.functions.ts"
}, (opts) => lookupById.__executeServer(opts));
const lookupById = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  query: z.string().min(1).max(64)
}).parse(d)).handler(lookupById_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const q = data.query.trim();
  const isUuid = UUID_RE.test(q);
  const prefix = q.slice(0, 4).toUpperCase();
  if (!isUuid && (prefix === "ART-" || prefix === "PCE-" || prefix === "TXN-")) {
    if (prefix === "ART-") return {
      kind: "artist",
      payload: await loadArtist(q)
    };
    if (prefix === "PCE-") return {
      kind: "piece",
      payload: await loadPiece(q)
    };
    if (prefix === "TXN-") return {
      kind: "transaction",
      payload: await loadTxn(q)
    };
  }
  if (isUuid) {
    const [a, p, t] = await Promise.all([loadArtist(q), loadPiece(q), loadTxn(q)]);
    if (a) return {
      kind: "artist",
      payload: a
    };
    if (p) return {
      kind: "piece",
      payload: p
    };
    if (t) return {
      kind: "transaction",
      payload: t
    };
  }
  return {
    kind: "not_found",
    payload: null
  };
});
async function loadArtist(idOrCode) {
  const key = matchKey(idOrCode);
  const {
    data: artist
  } = await (await __get_admin()).from("artists").select("*").eq(key, idOrCode).maybeSingle();
  if (!artist) return null;
  const {
    data: works
  } = await (await __get_admin()).from("artworks").select("id, short_code, title, lifecycle_status, view_count, price, currency, created_at").eq("artist_id", artist.id).order("created_at", {
    ascending: false
  });
  return {
    artist,
    works: works ?? []
  };
}
async function loadPiece(idOrCode) {
  const key = matchKey(idOrCode);
  const {
    data: piece
  } = await (await __get_admin()).from("artworks").select("*, artist:artists(id, short_code, name, country)").eq(key, idOrCode).maybeSingle();
  return piece ?? null;
}
async function loadTxn(idOrCode) {
  const key = matchKey(idOrCode);
  const {
    data: txn
  } = await (await __get_admin()).from("admin_transactions").select("*").eq(key, idOrCode).maybeSingle();
  return txn ?? null;
}
const listTransactions_createServerFn_handler = createServerRpc({
  id: "334769fd23ab837b04e9451aab367cb3e61067a51fe7bc9e62dace0479747ee5",
  name: "listTransactions",
  filename: "src/lib/catalogue.functions.ts"
}, (opts) => listTransactions.__executeServer(opts));
const listTransactions = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(listTransactions_createServerFn_handler, async ({
  context
}) => {
  await assertAdmin(context.userId);
  const {
    data,
    error
  } = await (await __get_admin()).from("admin_transactions").select("*").order("created_at", {
    ascending: false
  }).limit(200);
  if (error) throw new Error(error.message);
  return {
    rows: data ?? []
  };
});
export {
  bumpView_createServerFn_handler,
  getAllocations_createServerFn_handler,
  getArtistDetail_createServerFn_handler,
  getCatalogueArtists_createServerFn_handler,
  getCataloguePieces_createServerFn_handler,
  getPieceDetail_createServerFn_handler,
  listTransactions_createServerFn_handler,
  lookupById_createServerFn_handler,
  saveAllocations_createServerFn_handler
};
