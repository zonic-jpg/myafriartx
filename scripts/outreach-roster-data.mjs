/** Curated public artist rosters — see outreach-roster-countries/*.mjs per region. */
import { GHANA } from "./outreach-roster-countries/ghana.mjs";
import { KENYA } from "./outreach-roster-countries/kenya.mjs";
import { BOTSWANA } from "./outreach-roster-countries/botswana.mjs";
import { SOUTH_AFRICA } from "./outreach-roster-countries/south-africa.mjs";
import { CAPE_VERDE } from "./outreach-roster-countries/cape-verde.mjs";
import { MAURITIUS } from "./outreach-roster-countries/mauritius.mjs";
import { MOROCCO } from "./outreach-roster-countries/morocco.mjs";
import { EGYPT } from "./outreach-roster-countries/egypt.mjs";
import { CONGO } from "./outreach-roster-countries/congo.mjs";
import { SAO_TOME } from "./outreach-roster-countries/sao-tome.mjs";
import { SENEGAL } from "./outreach-roster-countries/senegal.mjs";
import { SIERRA_LEONE } from "./outreach-roster-countries/sierra-leone.mjs";
import { LIBERIA } from "./outreach-roster-countries/liberia.mjs";
import { BENIN } from "./outreach-roster-countries/benin.mjs";
import { MOZAMBIQUE } from "./outreach-roster-countries/mozambique.mjs";
import { TOGO } from "./outreach-roster-countries/togo.mjs";
import { CAMEROON } from "./outreach-roster-countries/cameroon.mjs";

export const ALL_ROSTERS = {
  Ghana: GHANA,
  Kenya: KENYA,
  Botswana: BOTSWANA,
  "South Africa": SOUTH_AFRICA,
  "Cape Verde": CAPE_VERDE,
  Mauritius: MAURITIUS,
  Morocco: MOROCCO,
  Egypt: EGYPT,
  "Democratic Republic of the Congo": CONGO.drc,
  "Republic of the Congo": CONGO.brazzaville,
  "São Tomé and Príncipe": SAO_TOME,
  Senegal: SENEGAL,
  "Sierra Leone": SIERRA_LEONE,
  Liberia: LIBERIA,
  Benin: BENIN,
  Mozambique: MOZAMBIQUE,
  Togo: TOGO,
  Cameroon: CAMEROON,
};

export const NIGERIAN_REPLACEMENTS = {
  "ART-OUT-089": { name: "Logo Oluwamuyiwa", medium: "Photography", city: "Lagos", note: "Street photography" },
  "ART-OUT-090": { name: "Ema Edosio", medium: "Film/Video", city: "Lagos", note: "Filmmaker and visual artist" },
  "ART-OUT-091": { name: "Adeola Olagunju", medium: "Photography", city: "Lagos", note: "Performance photography" },
  "ART-OUT-092": { name: "Ugonna-Ora Owoh", medium: "Painting", city: "Lagos", note: "Contemporary painter" },
  "ART-OUT-093": { name: "Bolaji Banwo", medium: "Digital art", city: "Lagos", note: "Digital illustrator" },
  "ART-OUT-094": { name: "Ayo Filade", medium: "Painting", city: "Lagos", note: "Abstract painter" },
  "ART-OUT-095": { name: "Kenny Adewuyi", medium: "Sculpture", city: "Lagos", note: "Metal sculptor" },
  "ART-OUT-096": { name: "Elizabeth Ekadashi", medium: "Painting", city: "Abuja", note: "Contemporary painter" },
  "ART-OUT-097": { name: "Femi Johnson", medium: "Photography", city: "Lagos", note: "Documentary photographer" },
  "ART-OUT-098": { name: "Moyosore Okunoren", medium: "Fashion/Textile", city: "Lagos", note: "Fashion artist" },
  "ART-OUT-099": { name: "Qudus Onikeku", medium: "Performance", city: "Lagos", note: "Choreographer and performance artist" },
  "ART-OUT-100": { name: "Henry Mzili Mujunga", medium: "Painting", city: "Lagos", note: "Ugandan-Nigerian contemporary painter exhibited in Lagos" },
};

export const NIGERIAN_WORKS = {};

export const NIGERIAN_WIKI = {
  "ART-OUT-001": "Dotun Popoola",
  "ART-OUT-002": "Peju Alatise",
  "ART-OUT-003": "Victor Ehikhamenor",
  "ART-OUT-006": "Nike Okundaye",
  "ART-OUT-028": "Emeka Ogboh",
  "ART-OUT-049": "Toyin Ojih Odutola",
};
