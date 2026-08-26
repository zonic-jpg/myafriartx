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
const signRenderImageUrls = async (...__a) => (await import("./render-urls.server-CqQfPe29.js")).signRenderImageUrls(...__a);
const assertAdmin = async (...__a) => (await import("./auth-helpers.server-DfoiTon6.js")).assertAdmin(...__a);
function boolSetting(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}
const adminGetAll_createServerFn_handler = createServerRpc({
  id: "953556d324aa110aefe4d50eab6568ad9ede9295aff107c91e64260cf639996e",
  name: "adminGetAll",
  filename: "src/lib/admin.functions.ts"
}, (opts) => adminGetAll.__executeServer(opts));
const adminGetAll = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(adminGetAll_createServerFn_handler, async ({
  context
}) => {
  const {
    supabase,
    userId
  } = context;
  await assertAdmin(userId);
  const [artists, artworks, styles, renders, panes, settings] = await Promise.all([supabase.from("artists").select("*").order("name"), supabase.from("artworks").select("*").order("title"), supabase.from("styles").select("*").order("sort_order"), supabase.from("renders").select("*").order("created_at", {
    ascending: false
  }).limit(200), supabase.from("landing_panes").select("*").order("sort_order"), supabase.from("app_settings").select("key,value").in("key", ["mock_catalogue_enabled"])]);
  const signedRenders = await Promise.all((renders.data ?? []).map(signRenderImageUrls));
  const settingsMap = Object.fromEntries((settings.data ?? []).map((row) => [row.key, row.value]));
  return {
    artists: artists.data ?? [],
    artworks: artworks.data ?? [],
    styles: styles.data ?? [],
    renders: signedRenders,
    panes: panes.data ?? [],
    settings: {
      mock_catalogue_enabled: boolSetting(settingsMap.mock_catalogue_enabled, true)
    }
  };
});
const setMockCatalogueEnabled_createServerFn_handler = createServerRpc({
  id: "594d28f159a8351134c0b93cee6859a661e18f55733c6c5c9cbc256f15561447",
  name: "setMockCatalogueEnabled",
  filename: "src/lib/admin.functions.ts"
}, (opts) => setMockCatalogueEnabled.__executeServer(opts));
const setMockCatalogueEnabled = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  enabled: z.boolean()
}).parse(d)).handler(setMockCatalogueEnabled_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    error
  } = await (await __get_admin()).from("app_settings").upsert({
    key: "mock_catalogue_enabled",
    value: data.enabled,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const setRenderFeatured_createServerFn_handler = createServerRpc({
  id: "1f09e68f364035208ea762d184ea50c2282eb9e3bfcf9e9fdc426e9e0286ed5c",
  name: "setRenderFeatured",
  filename: "src/lib/admin.functions.ts"
}, (opts) => setRenderFeatured.__executeServer(opts));
const setRenderFeatured = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid(),
  is_featured: z.boolean()
}).parse(d)).handler(setRenderFeatured_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    error
  } = await context.supabase.from("renders").update({
    is_featured: data.is_featured
  }).eq("id", data.id);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const deleteRender_createServerFn_handler = createServerRpc({
  id: "350386313a572ae4af2dfeb9aee3cf1811b8e730a236bcfe410ab10ffd5a3400",
  name: "deleteRender",
  filename: "src/lib/admin.functions.ts"
}, (opts) => deleteRender.__executeServer(opts));
const deleteRender = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(deleteRender_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    error
  } = await context.supabase.from("renders").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const ArtistIn = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  bio: z.string().max(2e3).nullable().optional(),
  era: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  alma_mater: z.string().max(200).nullable().optional(),
  portrait_url: z.string().url().nullable().optional(),
  content_source: z.enum(["live", "mock"]).default("live"),
  gender: z.string().max(20).nullable().optional(),
  domicile_city: z.string().max(100).nullable().optional(),
  date_of_birth: z.string().max(20).nullable().optional(),
  short_code: z.string().max(20).nullable().optional()
});
const saveArtist_createServerFn_handler = createServerRpc({
  id: "b013d71985226f4f10d983a8212b053439c325b7f55c5f4dfcbbc233e8a826cb",
  name: "saveArtist",
  filename: "src/lib/admin.functions.ts"
}, (opts) => saveArtist.__executeServer(opts));
const saveArtist = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => ArtistIn.parse(d)).handler(saveArtist_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    id,
    ...patch
  } = data;
  const q = id ? await context.supabase.from("artists").update(patch).eq("id", id).select().single() : await context.supabase.from("artists").insert(patch).select().single();
  if (q.error) throw new Error(q.error.message);
  return q.data;
});
const deleteArtist_createServerFn_handler = createServerRpc({
  id: "19a8a929e9ba11f3b2db8dd34ccd133a6a81fcc640234b21e93d6439baff99af",
  name: "deleteArtist",
  filename: "src/lib/admin.functions.ts"
}, (opts) => deleteArtist.__executeServer(opts));
const deleteArtist = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(deleteArtist_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    error
  } = await context.supabase.from("artists").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const MEDIA = ["oil", "watercolor", "pastel", "sculpture", "photograph", "print", "mixed_media"];
const MAX_DECODED_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 8e7;
const IMAGE_CONTENT_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};
const BLOCKED_TEXT_SIGNATURES = ["<svg", "<script", "javascript:", "<?php", "<html", "<!doctype"];
function sniffImageMime(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 255 && buf[1] === 216 && buf[2] === 255) return "image/jpeg";
  if (buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71 && buf[4] === 13 && buf[5] === 10 && buf[6] === 26 && buf[7] === 10) return "image/png";
  if (buf[0] === 82 && buf[1] === 73 && buf[2] === 70 && buf[3] === 70 && buf[8] === 87 && buf[9] === 69 && buf[10] === 66 && buf[11] === 80) return "image/webp";
  return null;
}
function readU32BE(buf, offset) {
  return (buf[offset] << 24 | buf[offset + 1] << 16 | buf[offset + 2] << 8 | buf[offset + 3]) >>> 0;
}
function getImageDimensions(buf, mime) {
  if (mime === "image/png" && buf.length >= 24) return {
    width: readU32BE(buf, 16),
    height: readU32BE(buf, 20)
  };
  if (mime === "image/jpeg") {
    for (let i = 2; i + 9 < buf.length; ) {
      if (buf[i] !== 255) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      const len = (buf[i + 2] << 8) + buf[i + 3];
      if (len < 2) return null;
      if (marker >= 192 && marker <= 207 && ![196, 200, 204].includes(marker)) {
        return {
          height: (buf[i + 5] << 8) + buf[i + 6],
          width: (buf[i + 7] << 8) + buf[i + 8]
        };
      }
      i += 2 + len;
    }
  }
  if (mime === "image/webp" && buf.length >= 30) {
    const chunk = String.fromCharCode(buf[12], buf[13], buf[14], buf[15]);
    if (chunk === "VP8X") return {
      width: 1 + buf[24] + (buf[25] << 8) + (buf[26] << 16),
      height: 1 + buf[27] + (buf[28] << 8) + (buf[29] << 16)
    };
    if (chunk === "VP8 " && buf.length >= 30) return {
      width: (buf[26] | buf[27] << 8) & 16383,
      height: (buf[28] | buf[29] << 8) & 16383
    };
    if (chunk === "VP8L" && buf.length >= 25) return {
      width: 1 + ((buf[22] & 63) << 8 | buf[21]),
      height: 1 + ((buf[24] & 15) << 10 | buf[23] << 2 | (buf[22] & 192) >> 6)
    };
  }
  return null;
}
function assertImageSafe(buf, mime) {
  const startsWith = (...bytes) => bytes.every((byte, index) => buf[index] === byte);
  if (startsWith(77, 90) || startsWith(127, 69, 76, 70) || startsWith(37, 80, 68, 70) || startsWith(80, 75, 3, 4) || startsWith(82, 97, 114, 33) || startsWith(55, 122, 188, 175, 39, 28)) throw new Error("Image rejected: unsafe file signature detected.");
  const text = new TextDecoder("latin1").decode(buf.slice(0, Math.min(buf.length, 2e6))).toLowerCase();
  for (const sig of BLOCKED_TEXT_SIGNATURES) {
    if (text.includes(sig.toLowerCase())) throw new Error("Image rejected: unsafe embedded content detected.");
  }
  const dims = getImageDimensions(buf, mime);
  if (!dims || dims.width < 1 || dims.height < 1) throw new Error("Image rejected: dimensions could not be verified.");
  if (dims.width * dims.height > MAX_IMAGE_PIXELS) throw new Error("Image rejected: dimensions are too large to process safely.");
}
async function scanImageForMalware(buf, filename, contentType) {
  assertImageSafe(buf, contentType);
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) return;
  const form = new FormData();
  const copy = new ArrayBuffer(buf.byteLength);
  new Uint8Array(copy).set(buf);
  form.append("file", new Blob([copy], {
    type: contentType
  }), filename);
  const upload = await fetch("https://www.virustotal.com/api/v3/files", {
    method: "POST",
    headers: {
      "x-apikey": apiKey
    },
    body: form
  });
  if (!upload.ok) throw new Error("Image rejected: malware scanner is unavailable.");
  const uploaded = await upload.json();
  const analysisId = uploaded?.data?.id;
  if (!analysisId) throw new Error("Image rejected: malware scan could not start.");
  for (let i = 0; i < 8; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const res = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
      headers: {
        "x-apikey": apiKey
      }
    });
    if (!res.ok) throw new Error("Image rejected: malware scan could not complete.");
    const json = await res.json();
    const stats = json?.data?.attributes?.stats;
    if (stats && (stats.malicious > 0 || stats.suspicious > 0)) throw new Error("Image rejected: malware detected.");
    if (json?.data?.attributes?.status === "completed") return;
  }
  throw new Error("Image rejected: malware scan timed out.");
}
const ArtworkIn = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  artist_id: z.string().uuid().nullable().optional(),
  medium: z.enum(MEDIA),
  year: z.string().max(20).nullable().optional(),
  image_url: z.union([z.string().url(), z.literal("")]).nullable().optional().transform((v) => v ?? ""),
  description: z.string().max(2e3).nullable().optional(),
  is_active: z.boolean().default(true),
  content_source: z.enum(["live", "mock"]).default("live"),
  price: z.number().min(0).max(1e8).nullable().optional(),
  currency: z.string().min(3).max(3).regex(/^[A-Z]{3}$/).default("USD"),
  lifecycle_status: z.enum(["in_catalogue", "sold", "withdrawn"]).default("in_catalogue")
});
const saveArtwork_createServerFn_handler = createServerRpc({
  id: "ae31d093f9f3faceb2e65991254d5d74344b580d26e087dddfbfa9880b6a3125",
  name: "saveArtwork",
  filename: "src/lib/admin.functions.ts"
}, (opts) => saveArtwork.__executeServer(opts));
const saveArtwork = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => ArtworkIn.parse(d)).handler(saveArtwork_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    id,
    ...patch
  } = data;
  const q = id ? await context.supabase.from("artworks").update(patch).eq("id", id).select().single() : await context.supabase.from("artworks").insert(patch).select().single();
  if (q.error) throw new Error(q.error.message);
  return q.data;
});
const deleteArtwork_createServerFn_handler = createServerRpc({
  id: "4c9360b988c3211c82696e922932426ed88fb30feef87ca3d2c7c214d55dd6b5",
  name: "deleteArtwork",
  filename: "src/lib/admin.functions.ts"
}, (opts) => deleteArtwork.__executeServer(opts));
const deleteArtwork = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(deleteArtwork_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    error
  } = await context.supabase.from("artworks").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const StyleIn = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  prompt_fragment: z.string().min(1).max(1e3),
  sort_order: z.number().int().min(0).max(999).default(0),
  is_active: z.boolean().default(true)
});
const saveStyle_createServerFn_handler = createServerRpc({
  id: "ef65573019a2c0160af7e5220011a959fcc65a597ffc17e1eb4c47561171a1e3",
  name: "saveStyle",
  filename: "src/lib/admin.functions.ts"
}, (opts) => saveStyle.__executeServer(opts));
const saveStyle = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => StyleIn.parse(d)).handler(saveStyle_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    id,
    ...patch
  } = data;
  const q = id ? await context.supabase.from("styles").update(patch).eq("id", id).select().single() : await context.supabase.from("styles").insert(patch).select().single();
  if (q.error) throw new Error(q.error.message);
  return q.data;
});
const deleteStyle_createServerFn_handler = createServerRpc({
  id: "e4e8ab58ac1fb192d2cc6b7da4d983e1884aeae1684145152c44ee98e8a8023d",
  name: "deleteStyle",
  filename: "src/lib/admin.functions.ts"
}, (opts) => deleteStyle.__executeServer(opts));
const deleteStyle = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(deleteStyle_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    error
  } = await context.supabase.from("styles").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const uploadArtworkImage_createServerFn_handler = createServerRpc({
  id: "f5e35a90d8a6aa94e410a93e5b5913eeadb2d5831e29d5f57401adf5b1214512",
  name: "uploadArtworkImage",
  filename: "src/lib/admin.functions.ts"
}, (opts) => uploadArtworkImage.__executeServer(opts));
const uploadArtworkImage = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  base64: z.string().min(100).max(2e7),
  filename: z.string().min(1).max(200)
}).parse(d)).handler(uploadArtworkImage_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const b64 = data.base64.includes(",") ? data.base64.split(",")[1] : data.base64;
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  if (buf.length > MAX_DECODED_IMAGE_BYTES) throw new Error("Image too large. Use a file under 10 MB.");
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const ext = (data.filename.split(".").pop() || "").toLowerCase();
  const declaredType = IMAGE_CONTENT_TYPES[ext];
  if (!declaredType) throw new Error("Unsupported image format. Use JPG, PNG, or WEBP.");
  const sniffedType = sniffImageMime(buf);
  if (!sniffedType) throw new Error("File is not a recognised image. Use JPG, PNG, or WEBP.");
  if (sniffedType !== declaredType) {
    throw new Error("File contents do not match its extension. Use a real JPG, PNG, or WEBP.");
  }
  await scanImageForMalware(buf, data.filename, sniffedType);
  const path = `library/${crypto.randomUUID()}.${ext}`;
  const up = await (await __get_admin()).storage.from("artworks").upload(path, buf, {
    contentType: sniffedType,
    upsert: false
  });
  if (up.error) {
    console.error("[admin] artwork upload error:", up.error.message);
    throw new Error("Artwork upload failed. Please try again.");
  }
  const {
    data: pub
  } = (await __get_admin()).storage.from("artworks").getPublicUrl(path);
  return {
    url: pub.publicUrl
  };
});
const checkIsAdmin_createServerFn_handler = createServerRpc({
  id: "d7ab752d5c5280d2ee84a9875749b1cba0d95c7bbe892baa67e4f3368bfac36c",
  name: "checkIsAdmin",
  filename: "src/lib/admin.functions.ts"
}, (opts) => checkIsAdmin.__executeServer(opts));
const checkIsAdmin = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(checkIsAdmin_createServerFn_handler, async ({
  context
}) => {
  const {
    data
  } = await (await __get_admin()).from("user_roles").select("id").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  return {
    isAdmin: !!data
  };
});
const PaneIn = z.object({
  id: z.string().uuid().optional(),
  pane_id: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/),
  kicker: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  reveal: z.string().max(1e3).default(""),
  image_url: z.string().url().nullable().optional(),
  image_url_mobile: z.string().url().nullable().optional(),
  sort_order: z.number().int().min(0).max(999).default(0),
  is_active: z.boolean().default(true),
  status: z.enum(["draft", "published"]).default("draft")
});
const savePane_createServerFn_handler = createServerRpc({
  id: "d9c92bfd82ed56572188fa9f25db43222ed80901039b76e271684be9f0663ca5",
  name: "savePane",
  filename: "src/lib/admin.functions.ts"
}, (opts) => savePane.__executeServer(opts));
const savePane = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => PaneIn.parse(d)).handler(savePane_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    id,
    ...patch
  } = data;
  const q = id ? await context.supabase.from("landing_panes").update(patch).eq("id", id).select().single() : await context.supabase.from("landing_panes").insert(patch).select().single();
  if (q.error) throw new Error(q.error.message);
  return q.data;
});
const deletePane_createServerFn_handler = createServerRpc({
  id: "ac5a21da7632cc2678781a715ab72a807b49bbf0eae8dc5de453b9bfa9023adb",
  name: "deletePane",
  filename: "src/lib/admin.functions.ts"
}, (opts) => deletePane.__executeServer(opts));
const deletePane = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(deletePane_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    error
  } = await context.supabase.from("landing_panes").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const reorderPanes_createServerFn_handler = createServerRpc({
  id: "c0964fecf255071c488ee302d0c58c128bfda1573452ff41d37468cbe755d6cf",
  name: "reorderPanes",
  filename: "src/lib/admin.functions.ts"
}, (opts) => reorderPanes.__executeServer(opts));
const reorderPanes = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  order: z.array(z.object({
    id: z.string().uuid(),
    sort_order: z.number().int().min(0).max(999)
  })).min(1).max(100)
}).parse(d)).handler(reorderPanes_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  for (const row of data.order) {
    const {
      error
    } = await context.supabase.from("landing_panes").update({
      sort_order: row.sort_order
    }).eq("id", row.id);
    if (error) throw new Error(error.message);
  }
  return {
    ok: true
  };
});
const setPaneStatus_createServerFn_handler = createServerRpc({
  id: "6335fa69c8bd6ce771377c93234891b3d212e019767d39bdca1f0e5ffd9ba7eb",
  name: "setPaneStatus",
  filename: "src/lib/admin.functions.ts"
}, (opts) => setPaneStatus.__executeServer(opts));
const setPaneStatus = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "published"])
}).parse(d)).handler(setPaneStatus_createServerFn_handler, async ({
  data,
  context
}) => {
  await assertAdmin(context.userId);
  const {
    error
  } = await context.supabase.from("landing_panes").update({
    status: data.status
  }).eq("id", data.id);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
export {
  adminGetAll_createServerFn_handler,
  checkIsAdmin_createServerFn_handler,
  deleteArtist_createServerFn_handler,
  deleteArtwork_createServerFn_handler,
  deletePane_createServerFn_handler,
  deleteRender_createServerFn_handler,
  deleteStyle_createServerFn_handler,
  reorderPanes_createServerFn_handler,
  saveArtist_createServerFn_handler,
  saveArtwork_createServerFn_handler,
  savePane_createServerFn_handler,
  saveStyle_createServerFn_handler,
  setMockCatalogueEnabled_createServerFn_handler,
  setPaneStatus_createServerFn_handler,
  setRenderFeatured_createServerFn_handler,
  uploadArtworkImage_createServerFn_handler
};
