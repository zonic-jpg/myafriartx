#!/usr/bin/env node
/**
 * Builds outreach roster JSON + works JSON using public Wikipedia/Wikimedia data.
 * Usage: node scripts/build-outreach-roster.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_ROSTERS, NIGERIAN_REPLACEMENTS, NIGERIAN_WORKS, NIGERIAN_WIKI } from "./outreach-roster-data.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CSV_PATH = resolve(root, "data/nigerian-artists-outreach-100.csv");
const REGIONAL_OUT = resolve(root, "data/african-artists-outreach-regional.json");
const WORKS_OUT = resolve(root, "data/outreach-works.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wikiPageImages(title, limit = 5) {
  try {
    const params = new URLSearchParams({
      action: "query",
      titles: title,
      prop: "images",
      imlimit: String(Math.max(limit, 5)),
      format: "json",
      origin: "*",
    });
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
    if (!res.ok) return wikiFallback(title, limit);
    const json = await res.json();
    const pages = json.query?.pages ?? {};
    const page = Object.values(pages)[0];
    if (!page?.images) return wikiFallback(title, limit);

    const works = [];
    for (const img of page.images) {
      if (works.length >= limit) break;
      const fileName = img.title.replace(/^File:/, "");
      if (/icon|logo|svg|flag|signature|commons-logo/i.test(fileName)) continue;
      const infoParams = new URLSearchParams({
        action: "query",
        titles: img.title,
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: "800",
        format: "json",
        origin: "*",
      });
      const infoRes = await fetch(`https://commons.wikimedia.org/w/api.php?${infoParams}`);
      if (!infoRes.ok) continue;
      const infoJson = await infoRes.json();
      const infoPage = Object.values(infoJson.query?.pages ?? {})[0];
      const info = infoPage?.imageinfo?.[0];
      if (!info?.thumburl?.startsWith("https://")) continue;
      const desc = info.extmetadata?.ObjectName?.value ?? fileName.replace(/\.[^.]+$/, "").replace(/_/g, " ");
      works.push({
        title: desc.replace(/<[^>]+>/g, "").slice(0, 120),
        image_url: info.thumburl,
        source_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName.replace(/ /g, "_"))}`,
      });
      await sleep(120);
    }
    return works.length ? works : wikiFallback(title, limit);
  } catch {
    return wikiFallback(title, limit);
  }
}

function wikiFallback(title, limit) {
  const source = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  return [{ title: `${title} (public reference)`, image_url: null, source_url: source }].slice(0, limit);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

// Patch Nigerian CSV placeholders
let csvText = readFileSync(CSV_PATH, "utf8");
for (const [code, artist] of Object.entries(NIGERIAN_REPLACEMENTS)) {
  const re = new RegExp(
    `Emerging Artist ${code.replace("ART-OUT-", "")},[^\\n]*${code.replace(/-/g, "\\-")}[^\\n]*`,
    "i",
  );
  const line = `${artist.name},${artist.medium},${artist.city},Nigeria,${artist.website ?? ""},https://myafriartx.netlify.app/artist/${code},curated_public_repo_wayback,${artist.note},seed`;
  csvText = csvText.replace(re, line);
}
writeFileSync(CSV_PATH, csvText);

const csvRows = parseCsv(csvText);
const csvHeader = csvRows[0].map((h) => h.trim());
const nigerianCodes = [];
for (const cells of csvRows.slice(1)) {
  const r = Object.fromEntries(csvHeader.map((key, i) => [key, (cells[i] ?? "").trim()]));
  const match = /\/artist\/([A-Za-z0-9-]+)/i.exec(r.myafriart_profile_url ?? "");
  if (match) nigerianCodes.push(match[1].toUpperCase());
}

let nextCode = 101;
const regionalArtists = [];
/** @type {Record<string, Array<{title?: string, image_url?: string, source_url?: string}>>} */
const worksByCode = { ...NIGERIAN_WORKS };

for (const [country, roster] of Object.entries(ALL_ROSTERS)) {
  if (roster.artists.length !== roster.count) {
    console.warn(`${country}: expected ${roster.count}, got ${roster.artists.length}`);
  }
  for (const a of roster.artists) {
    const short_code = `ART-OUT-${String(nextCode++).padStart(3, "0")}`;
    regionalArtists.push({
      short_code,
      name: a.name,
      primary_medium: a.medium,
      domicile_city: a.city,
      country: a.country ?? country,
      website: a.website ?? null,
      gender: a.gender ?? null,
      birth_year: a.birth_year ?? null,
      outreach_note: a.note ?? null,
      outreach_source: "curated_public",
      outreach_status: "seed",
    });

    if (a.works?.length) {
      worksByCode[short_code] = a.works.slice(0, 5);
    } else if (a.wikipedia) {
      process.stdout.write(`Fetching works for ${a.name}… `);
      const works = await wikiPageImages(a.wikipedia, 5);
      worksByCode[short_code] = works;
      console.log(works.length);
      await sleep(200);
    } else {
      worksByCode[short_code] = [];
    }
    if (!worksByCode[short_code].length) {
      worksByCode[short_code] = [
        {
          title: `${a.name} (public reference)`,
          image_url: null,
          source_url: a.wikipedia
            ? `https://en.wikipedia.org/wiki/${encodeURIComponent(a.wikipedia.replace(/ /g, "_"))}`
            : null,
        },
      ];
    }
  }
}

for (const code of nigerianCodes) {
  if (!worksByCode[code]) worksByCode[code] = [];
  if (worksByCode[code].length === 0 && NIGERIAN_WIKI[code]) {
    process.stdout.write(`Fetching Nigerian works for ${NIGERIAN_WIKI[code]}… `);
    const works = await wikiPageImages(NIGERIAN_WIKI[code], 5);
    worksByCode[code] = works;
    console.log(works.length);
    await sleep(200);
  }
  if (worksByCode[code].length === 0) {
    const row = csvRows.slice(1).map((cells) => Object.fromEntries(csvHeader.map((key, i) => [key, (cells[i] ?? "").trim()]))).find((r) => {
      const m = /\/artist\/([A-Za-z0-9-]+)/i.exec(r.myafriart_profile_url ?? "");
      return m && m[1].toUpperCase() === code;
    });
    if (row) {
      worksByCode[code] = [
        {
          title: `${row.name} (public reference)`,
          image_url: null,
          source_url: row.website
            ? (row.website.startsWith("http") ? row.website : `https://${row.website}`)
            : null,
        },
      ];
    }
  }
}

// Pad every artist to 5 slots (empty slots allowed)
for (const code of [...nigerianCodes, ...regionalArtists.map((a) => a.short_code)]) {
  const works = worksByCode[code] ?? [];
  while (works.length < 5) works.push({ title: null, image_url: null, source_url: null });
  worksByCode[code] = works.slice(0, 5);
}

writeFileSync(REGIONAL_OUT, `${JSON.stringify({ artists: regionalArtists }, null, 2)}\n`);
writeFileSync(WORKS_OUT, `${JSON.stringify(worksByCode, null, 2)}\n`);

const countryCounts = {};
for (const a of regionalArtists) {
  countryCounts[a.country] = (countryCounts[a.country] ?? 0) + 1;
}
console.log("Regional country counts:", countryCounts);
console.log(`Regional artists: ${regionalArtists.length}, Nigerian codes: ${nigerianCodes.length}`);
