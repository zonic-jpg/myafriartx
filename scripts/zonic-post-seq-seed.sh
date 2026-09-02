#!/usr/bin/env bash
# Seed ArtStage styles + MyYangaX blog_posts; set ArtStage Netlify function env.
# Run on the machine (outside sandbox): bash scripts/zonic-post-seq-seed.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Prefer calling from Downloads with sibling paths
ART="${ARTSTAGE_ROOT:-$HOME/Downloads/artstage-8}"
MY="${MYYANGA_ROOT:-$HOME/Downloads/MyYangaX-COMPLETE}"

node --input-type=module <<EOF
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
function parseEnv(file){const o={};try{for(const line of fs.readFileSync(file,'utf8').split('\n')){const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(!m)continue;let v=m[2].trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);o[m[1]]=v;}}catch{}return o;}
const art=parseEnv('$ART/.env');
const my={...parseEnv('$MY/.env'),...parseEnv('$MY/.env.local')};
const env={...my,...art};
const url=env.SUPABASE_URL||env.VITE_SUPABASE_URL;
const key=env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
const sb=createClient(url,key);
const styleRows=[
  {slug:'modern-gallery',name:'Modern gallery',description:'Clean white walls, museum spacing, soft daylight.',prompt_fragment:'modern gallery aesthetic: clean white or light plaster walls, generous negative space, soft museum daylight, thin dark frame if needed, calm contemporary interior',sort_order:10,is_active:true},
  {slug:'warm-living',name:'Warm living room',description:'Lived-in warmth — wood, textiles, soft lamps.',prompt_fragment:'warm residential living room: honey wood tones, soft lamp light, inviting textiles, natural shadows, artwork feels collected not staged',sort_order:20,is_active:true},
  {slug:'minimal-scandi',name:'Minimal Scandi',description:'Pale wood, airy light, restrained palette.',prompt_fragment:'Scandinavian minimal interior: pale oak, airy white walls, restrained palette, plenty of daylight, quiet framing, uncluttered wall plane',sort_order:30,is_active:true},
  {slug:'bold-afropolitan',name:'Bold Afropolitan',description:'Rich colour, pattern dialogue, confident placement.',prompt_fragment:'Afropolitan interior: rich wall colour or patterned context, confident artwork scale, dialogue with textiles and craft, dramatic but realistic lighting',sort_order:40,is_active:true},
  {slug:'loft-industrial',name:'Loft industrial',description:'Brick, concrete, tall windows, urban loft.',prompt_fragment:'urban loft: exposed brick or concrete, tall windows, industrial metal accents, large-scale wall placement, cool daylight with soft falloff',sort_order:50,is_active:true},
];
const s=await sb.from('styles').upsert(styleRows,{onConflict:'slug'}).select('slug');
console.log(s.error?'STYLE_FAIL '+s.error.message:'STYLE_OK', (s.data||[]).map(d=>d.slug).join(','));

const {SEED_BLOG_POSTS,normalizeBlogBody}=await import('$MY/src/lib/blogPosts.js');
const myUrl=my.VITE_SUPABASE_URL||url;
const myKey=my.SUPABASE_SERVICE_ROLE_KEY||key;
const sb2=createClient(myUrl,myKey);
const brows=SEED_BLOG_POSTS.map(p=>({slug:p.slug,title:p.title,excerpt:p.excerpt,body:normalizeBlogBody(p.body),category:p.category,author:p.author,thumb:p.thumb,trending:!!p.trending,is_published:true,published_at:p.published_at}));
const b=await sb2.from('blog_posts').upsert(brows,{onConflict:'slug'}).select('slug');
console.log(b.error?'BLOG_FAIL '+b.error.message:'BLOG_OK', (b.data||[]).map(d=>d.slug).join(','));
console.log('Done. Set Netlify ArtStage GOOGLE_API_KEY via dashboard or netlify env:set if needed.');
EOF
