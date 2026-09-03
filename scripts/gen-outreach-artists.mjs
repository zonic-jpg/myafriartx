#!/usr/bin/env node
// Regenerates outreach-artist seed artefacts from curated source files:
//
//   data/nigerian-artists-outreach-100.csv
//   data/african-artists-outreach-regional.json
//   data/outreach-works.json
//     -> src/lib/outreach-artists.data.ts
//     -> src/lib/outreach-works.data.ts
//     -> supabase/migrations/20261004000000_regional_outreach_artists.sql
//
// Only columns present in the sources are emitted. Unknown fields stay NULL.
//
// Usage: node scripts/gen-outreach-artists.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CSV_PATH = resolve(root, "data/nigerian-artists-outreach-100.csv");
const REGIONAL_PATH = resolve(root, "data/african-artists-outreach-regional.json");
const WORKS_PATH = resolve(root, "data/outreach-works.json");
const DATA_OUT = resolve(root, "src/lib/outreach-artists.data.ts");
const WORKS_OUT = resolve(root, "src/lib/outreach-works.data.ts");
const MIGRATION_OUT = resolve(
  root,
  "supabase/migrations/20261004000000_regional_outreach_artists.sql",
);
const CSV_REL = "data/nigerian-artists-outreach-100.csv";
const REGIONAL_REL = "data/african-artists-outreach-regional.json";
const WORKS_REL = "data/outreach-works.json";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const codeFromUrl = (url) => {
  const match = /\/artist\/([A-Za-z0-9-]+)\s*$/.exec(url ?? "");
  return match ? match[1].toUpperCase() : "";
};

const rows = parseCsv(readFileSync(CSV_PATH, "utf8"));
const header = rows[0].map((h) => h.trim());
const csvRecords = rows
  .slice(1)
  .map((cells) => Object.fromEntries(header.map((key, i) => [key, (cells[i] ?? "").trim()])));

const csvSeeds = csvRecords.map((r, index) => {
  const shortCode = codeFromUrl(r.myafriart_profile_url);
  if (!shortCode) throw new Error(`CSV row ${index + 2}: no artist code in myafriart_profile_url`);
  if (!r.name) throw new Error(`CSV row ${index + 2}: missing name`);
  if (/^Emerging Artist \d+$/i.test(r.name)) {
    throw new Error(`CSV row ${index + 2}: placeholder artist "${r.name}" — replace with verified name`);
  }
  return {
    short_code: shortCode,
    name: r.name,
    primary_medium: r.medium || null,
    domicile_city: r.city || null,
    country: r.country || null,
    website: r.website || null,
    gender: r.gender || null,
    date_of_birth: r.birth_year ? `${r.birth_year}-01-01` : null,
    outreach_note: r.notes || null,
    outreach_source: r.source || null,
    outreach_status: r.outreach_status || null,
  };
});

const regional = JSON.parse(readFileSync(REGIONAL_PATH, "utf8"));
if (!Array.isArray(regional.artists)) throw new Error(`${REGIONAL_REL} must have an "artists" array`);

const regionalSeeds = regional.artists.map((r, index) => {
  if (!r.short_code) throw new Error(`Regional row ${index}: missing short_code`);
  if (!r.name) throw new Error(`Regional row ${index}: missing name`);
  return {
    short_code: r.short_code,
    name: r.name,
    primary_medium: r.primary_medium || r.medium || null,
    domicile_city: r.domicile_city || r.city || null,
    country: r.country || null,
    website: r.website || null,
    gender: r.gender || null,
    date_of_birth: r.birth_year ? `${r.birth_year}-01-01` : null,
    outreach_note: r.outreach_note || r.notes || null,
    outreach_source: r.outreach_source || r.source || "curated_public",
    outreach_status: r.outreach_status || "seed",
  };
});

const seeds = [...csvSeeds, ...regionalSeeds];
const codes = new Set(seeds.map((s) => s.short_code));
if (codes.size !== seeds.length) throw new Error("Duplicate artist codes across CSV and regional JSON");

const names = new Set(seeds.map((s) => s.name.toLowerCase()));
if (names.size !== seeds.length) throw new Error("Duplicate artist names in seed data");

const worksByCode = JSON.parse(readFileSync(WORKS_PATH, "utf8"));
for (const seed of seeds) {
  const works = worksByCode[seed.short_code];
  if (!Array.isArray(works)) throw new Error(`Missing works array for ${seed.short_code}`);
  if (works.length > 5) throw new Error(`${seed.short_code} has more than 5 works`);
}

const countryCounts = {};
for (const s of seeds) {
  countryCounts[s.country] = (countryCounts[s.country] ?? 0) + 1;
}
console.log("Country counts:", countryCounts);
console.log(`Total artists: ${seeds.length}`);

const banner = (comment) =>
  `${comment} Generated by scripts/gen-outreach-artists.mjs from ${CSV_REL}, ${REGIONAL_REL}, ${WORKS_REL}.
${comment} Do not edit by hand — update the source files and re-run the generator.
${comment} Only source-backed facts are seeded; unknown fields stay NULL.`;

const tsLiteral = (v) => (v === null || v === undefined ? "null" : JSON.stringify(v));
const tsRows = seeds
  .map(
    (s) => `  {
    short_code: ${tsLiteral(s.short_code)},
    name: ${tsLiteral(s.name)},
    primary_medium: ${tsLiteral(s.primary_medium)},
    domicile_city: ${tsLiteral(s.domicile_city)},
    country: ${tsLiteral(s.country)},
    website: ${tsLiteral(s.website)},
    gender: ${tsLiteral(s.gender)},
    date_of_birth: ${tsLiteral(s.date_of_birth)},
    outreach_note: ${tsLiteral(s.outreach_note)},
    outreach_source: ${tsLiteral(s.outreach_source)},
    outreach_status: ${tsLiteral(s.outreach_status)},
  },`,
  )
  .join("\n");

writeFileSync(
  DATA_OUT,
  `${banner("//")}

export type OutreachArtistSeed = {
  short_code: string;
  name: string;
  primary_medium: string | null;
  domicile_city: string | null;
  country: string | null;
  website: string | null;
  gender: string | null;
  date_of_birth: string | null;
  outreach_note: string | null;
  outreach_source: string | null;
  outreach_status: string | null;
};

export const OUTREACH_ARTIST_SEEDS: OutreachArtistSeed[] = [
${tsRows}
];
`,
);

const workEntries = [];
for (const seed of seeds) {
  const works = worksByCode[seed.short_code] ?? [];
  works.forEach((w, i) => {
    if (!w?.title && !w?.image_url && !w?.source_url) return;
    workEntries.push({
      artist_short_code: seed.short_code,
      slot: i + 1,
      title: w.title || null,
      image_url: w.image_url || null,
      source_url: w.source_url || null,
    });
  });
}

const worksTs = workEntries
  .map(
    (w) => `  {
    artist_short_code: ${tsLiteral(w.artist_short_code)},
    slot: ${w.slot},
    title: ${tsLiteral(w.title)},
    image_url: ${tsLiteral(w.image_url)},
    source_url: ${tsLiteral(w.source_url)},
  },`,
  )
  .join("\n");

writeFileSync(
  WORKS_OUT,
  `${banner("//")}

export type OutreachWorkSeed = {
  artist_short_code: string;
  slot: number;
  title: string | null;
  image_url: string | null;
  source_url: string | null;
};

export const OUTREACH_WORK_SEEDS: OutreachWorkSeed[] = [
${worksTs}
];
`,
);

const sqlLiteral = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);

const regionalSqlRows = regionalSeeds
  .map((s) => artistSqlRow(s))
  .join(",\n");

const nigerianSqlRows = csvSeeds
  .map((s) => artistSqlRow(s))
  .join(",\n");

function artistSqlRow(s) {
  return `  (${[
    s.short_code,
    s.name,
    s.primary_medium,
    s.domicile_city,
    s.country,
    s.website,
    s.gender,
    s.date_of_birth,
    s.outreach_note,
    s.outreach_source,
    s.outreach_status,
  ]
    .map(sqlLiteral)
    .join(", ")}, 'unclaimed_outreach', 'outreach')`;
}

const worksSql = workEntries
  .map(
    (w) => `insert into public.outreach_works (artist_short_code, artist_id, slot, title, image_url, source_url)
select ${sqlLiteral(w.artist_short_code)}, id, ${w.slot}, ${sqlLiteral(w.title)}, ${sqlLiteral(w.image_url)}, ${sqlLiteral(w.source_url)}
from public.artists where short_code = ${sqlLiteral(w.artist_short_code)}
on conflict (artist_short_code, slot) do update set
  title = excluded.title,
  image_url = excluded.image_url,
  source_url = excluded.source_url,
  artist_id = excluded.artist_id;`,
  )
  .join("\n");

writeFileSync(
  MIGRATION_OUT,
  `${banner("--")}
--
-- Regional outreach artists + public-reference works. Unclaimed profiles are
-- browsable at /artist/<short_code> but works are NOT for-sale inventory.

create table if not exists public.outreach_works (
  id uuid primary key default gen_random_uuid(),
  artist_short_code text not null,
  artist_id uuid references public.artists(id) on delete cascade,
  slot smallint not null check (slot >= 1 and slot <= 5),
  title text,
  image_url text check (image_url is null or image_url like 'https://%'),
  source_url text,
  created_at timestamptz not null default now(),
  unique (artist_short_code, slot)
);

create index if not exists idx_outreach_works_artist_id on public.outreach_works(artist_id);
create index if not exists idx_outreach_works_short_code on public.outreach_works(artist_short_code);

comment on table public.outreach_works is
  'Public-reference works for unclaimed outreach profiles. Not listed for sale.';

alter table public.outreach_works enable row level security;
drop policy if exists outreach_works_public_read on public.outreach_works;
create policy outreach_works_public_read on public.outreach_works
  for select using (true);
drop policy if exists outreach_works_admin_write on public.outreach_works;
create policy outreach_works_admin_write on public.outreach_works
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

insert into public.artists (
  short_code, name, primary_medium, domicile_city, country, website, gender, date_of_birth,
  outreach_note, outreach_source, outreach_status, profile_status, content_source
) values
${nigerianSqlRows}
on conflict (short_code) do update set
  name = excluded.name,
  primary_medium = excluded.primary_medium,
  domicile_city = excluded.domicile_city,
  country = excluded.country,
  website = excluded.website,
  gender = excluded.gender,
  date_of_birth = excluded.date_of_birth,
  outreach_note = excluded.outreach_note,
  outreach_source = excluded.outreach_source,
  outreach_status = excluded.outreach_status,
  profile_status = excluded.profile_status,
  content_source = excluded.content_source;

insert into public.artists (
  short_code, name, primary_medium, domicile_city, country, website, gender, date_of_birth,
  outreach_note, outreach_source, outreach_status, profile_status, content_source
) values
${regionalSqlRows}
on conflict (short_code) do update set
  name = excluded.name,
  primary_medium = excluded.primary_medium,
  domicile_city = excluded.domicile_city,
  country = excluded.country,
  website = excluded.website,
  gender = excluded.gender,
  date_of_birth = excluded.date_of_birth,
  outreach_note = excluded.outreach_note,
  outreach_source = excluded.outreach_source,
  outreach_status = excluded.outreach_status,
  profile_status = excluded.profile_status,
  content_source = excluded.content_source;

${worksSql}
`,
);

console.log(`Generated ${seeds.length} outreach artists, ${workEntries.length} works`);
console.log(`  ${DATA_OUT}`);
console.log(`  ${WORKS_OUT}`);
console.log(`  ${MIGRATION_OUT}`);
