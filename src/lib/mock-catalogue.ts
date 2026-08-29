/**
 * Seeded mock catalogue used when Supabase is unavailable or the admin
 * mock toggle is on. Every artist and piece has a stable short_code so
 * landing cards can deep-link to /artist/$code and /piece/$code and the
 * detail routes can resolve without a live database.
 */
import { localCatalogueAssets } from "@/lib/local-image-assets";
import {
  FEATURED_SEED_ARTISTS,
  FEATURED_SEED_ARTWORKS,
} from "@/lib/editorial-seed";

const currentYear = new Date().getFullYear();

export const MOCK_COUNTRY_CITIES: Record<string, string[]> = {
  Algeria: ["Algiers", "Oran"],
  Angola: ["Luanda", "Lobito"],
  Benin: ["Cotonou", "Porto-Novo"],
  Botswana: ["Gaborone", "Francistown"],
  "Burkina Faso": ["Ouagadougou", "Bobo-Dioulasso"],
  Burundi: ["Bujumbura", "Gitega"],
  "Cabo Verde": ["Praia", "Mindelo"],
  Cameroon: ["Yaoundé", "Douala"],
  "Central African Republic": ["Bangui", "Bimbo"],
  Chad: ["N'Djamena", "Moundou"],
  Comoros: ["Moroni", "Mutsamudu"],
  "Democratic Republic of the Congo": ["Kinshasa", "Lubumbashi"],
  "Republic of the Congo": ["Brazzaville", "Pointe-Noire"],
  "Côte d'Ivoire": ["Abidjan", "Yamoussoukro"],
  Djibouti: ["Djibouti", "Ali Sabieh"],
  Egypt: ["Cairo", "Alexandria"],
  "Equatorial Guinea": ["Malabo", "Bata"],
  Eritrea: ["Asmara", "Massawa"],
  Eswatini: ["Mbabane", "Manzini"],
  Ethiopia: ["Addis Ababa", "Dire Dawa"],
  Gabon: ["Libreville", "Port-Gentil"],
  Gambia: ["Banjul", "Serekunda"],
  Ghana: ["Accra", "Kumasi"],
  Guinea: ["Conakry", "Nzérékoré"],
  "Guinea-Bissau": ["Bissau", "Bafatá"],
  Kenya: ["Nairobi", "Mombasa"],
  Lesotho: ["Maseru", "Teyateyaneng"],
  Liberia: ["Monrovia", "Gbarnga"],
  Libya: ["Tripoli", "Benghazi"],
  Madagascar: ["Antananarivo", "Toamasina"],
  Malawi: ["Lilongwe", "Blantyre"],
  Mali: ["Bamako", "Sikasso"],
  Mauritania: ["Nouakchott", "Nouadhibou"],
  Mauritius: ["Port Louis", "Beau Bassin"],
  Morocco: ["Casablanca", "Marrakesh"],
  Mozambique: ["Maputo", "Beira"],
  Namibia: ["Windhoek", "Walvis Bay"],
  Niger: ["Niamey", "Zinder"],
  Nigeria: ["Lagos", "Abuja"],
  Rwanda: ["Kigali", "Butare"],
  "São Tomé and Príncipe": ["São Tomé", "Santo Amaro"],
  Senegal: ["Dakar", "Saint-Louis"],
  Seychelles: ["Victoria", "Anse Boileau"],
  "Sierra Leone": ["Freetown", "Bo"],
  Somalia: ["Mogadishu", "Hargeisa"],
  "South Africa": ["Cape Town", "Johannesburg"],
  "South Sudan": ["Juba", "Wau"],
  Sudan: ["Khartoum", "Port Sudan"],
  Tanzania: ["Dar es Salaam", "Arusha"],
  Togo: ["Lomé", "Sokodé"],
  Tunisia: ["Tunis", "Sfax"],
  Uganda: ["Kampala", "Entebbe"],
  Zambia: ["Lusaka", "Ndola"],
  Zimbabwe: ["Harare", "Bulawayo"],
};

const MOCK_MEDIA = [
  "Oil",
  "Acrylic",
  "Watercolor",
  "Pastel",
  "Ink",
  "Charcoal",
  "Mixed media",
  "Sculpture",
  "Photography",
  "Print",
  "Textile",
  "Ceramic",
];

const MOCK_GENDERS = ["Female", "Male"] as const;
const MOCK_FIRST_F = [
  "Adaeze",
  "Amara",
  "Chioma",
  "Fatou",
  "Imani",
  "Kemi",
  "Nala",
  "Sade",
  "Thandi",
  "Zola",
  "Aisha",
  "Lerato",
  "Ngozi",
  "Yaa",
];
const MOCK_FIRST_M = [
  "Ade",
  "Chidi",
  "Emeka",
  "Jabari",
  "Kwame",
  "Malik",
  "Obi",
  "Sekou",
  "Tunde",
  "Wale",
  "Kofi",
  "Tau",
  "Bayo",
  "Kamau",
];
const MOCK_LAST = [
  "Okonkwo",
  "Mensah",
  "Diallo",
  "Nwosu",
  "Abebe",
  "Okafor",
  "Banda",
  "Diop",
  "Mwangi",
  "Camara",
  "Adeyemi",
  "Traore",
  "Ndlovu",
  "Achebe",
];
const MOCK_TITLE_PREFIX = [
  "Harmattan",
  "Market Day",
  "River Echo",
  "Ancestor",
  "Indigo Field",
  "Sahel Light",
  "Palm Court",
  "Dust Song",
  "Lagoon",
  "Baobab",
  "Midnight Cloth",
  "Gold Dust",
];
const MOCK_TITLE_SUFFIX = [
  "I",
  "II",
  "Study",
  "Portrait",
  "Reverie",
  "Variation",
  "Nocturne",
  "Panel",
];

export type MockArtist = {
  id: string;
  short_code: string;
  name: string;
  country: string;
  gender: string;
  domicile_city: string;
  date_of_birth: string;
  portrait_url: string | null;
  bio: string | null;
  view_count: number;
};

export type MockArtwork = {
  id: string;
  short_code: string;
  title: string;
  medium: string;
  image_url: string;
  content_source: "mock";
  price: number;
  currency: "USD";
  year: string;
  description: string | null;
  lifecycle_status: "in_catalogue";
  view_count: number;
  is_active: boolean;
  is_pledged: boolean;
  artist_id: string;
  artist: MockArtist;
};

function pad(n: number, width = 3) {
  return String(n).padStart(width, "0");
}

function buildMockCatalogue(): { artworks: MockArtwork[]; artists: MockArtist[] } {
  const artworks: MockArtwork[] = [];
  const artistMap = new Map<string, MockArtist>();
  const countries = Object.keys(MOCK_COUNTRY_CITIES);
  let n = 0;
  let artistN = 0;

  countries.forEach((country, ci) => {
    const cities = MOCK_COUNTRY_CITIES[country];
    for (let k = 0; k < 4; k++) {
      n += 1;
      const medium = MOCK_MEDIA[(ci + k) % MOCK_MEDIA.length];
      const gender = MOCK_GENDERS[(ci + k) % MOCK_GENDERS.length];
      const firstPool = gender === "Female" ? MOCK_FIRST_F : MOCK_FIRST_M;
      const first = firstPool[(ci * 3 + k) % firstPool.length];
      const last = MOCK_LAST[(ci + k * 2) % MOCK_LAST.length];
      const city = cities[k % cities.length];
      const age = 22 + ((ci * 7 + k * 13) % 61);
      const dobYear = currentYear - age;
      const price = 250 + ((ci * 911 + k * 1733) % 47750);
      const yearMade = currentYear - ((ci + k) % 20);
      const img = localCatalogueAssets[(ci + k) % localCatalogueAssets.length];
      const titlePre = MOCK_TITLE_PREFIX[(ci + k) % MOCK_TITLE_PREFIX.length];
      const titleSuf = MOCK_TITLE_SUFFIX[(ci * 2 + k) % MOCK_TITLE_SUFFIX.length];

      const artistKey = `${country}::${first} ${last}::${k}`;
      let artist = artistMap.get(artistKey);
      if (!artist) {
        artistN += 1;
        artist = {
          id: `local-artist-${pad(artistN)}`,
          short_code: `ART-M${pad(artistN)}`,
          name: `${first} ${last}`,
          country,
          gender,
          domicile_city: city,
          date_of_birth: `${dobYear}-0${1 + (k % 8)}-1${(ci % 8) + 1}`,
          portrait_url: null,
          bio: `${first} ${last} is a ${country}-based artist working in ${medium.toLowerCase()}.`,
          view_count: 0,
        };
        artistMap.set(artistKey, artist);
      }

      artworks.push({
        id: `local-piece-${pad(n)}`,
        short_code: `PCE-M${pad(n)}`,
        title: `${titlePre} — ${titleSuf}`,
        medium,
        image_url: img,
        content_source: "mock",
        price,
        currency: "USD",
        year: String(yearMade),
        description: `A ${medium.toLowerCase()} work by ${artist.name}, made in ${yearMade}.`,
        lifecycle_status: "in_catalogue",
        view_count: 0,
        is_active: true,
        is_pledged: false,
        artist_id: artist.id,
        artist,
      });
    }
  });

  return { artworks, artists: Array.from(artistMap.values()) };
}

const BUILT = buildMockCatalogue();

export const LOCAL_MOCK_ARTWORKS: MockArtwork[] = [
  ...FEATURED_SEED_ARTWORKS,
  ...BUILT.artworks,
];
export const LOCAL_MOCK_ARTISTS: MockArtist[] = [
  ...FEATURED_SEED_ARTISTS,
  ...BUILT.artists,
];

export function isMockCatalogueCode(idOrCode: string): boolean {
  const s = idOrCode.trim().toUpperCase();
  return (
    s.startsWith("PCE-M") ||
    s.startsWith("ART-M") ||
    s.startsWith("PCE-DOTUN") ||
    s.startsWith("ART-DOTUN") ||
    s.startsWith("SEED-") ||
    s.startsWith("LOCAL-PIECE-") ||
    s.startsWith("LOCAL-ARTIST-")
  );
}

export function getMockPiece(idOrCode: string): MockArtwork | null {
  const q = idOrCode.trim();
  const upper = q.toUpperCase();
  return (
    LOCAL_MOCK_ARTWORKS.find(
      (a) => a.short_code.toUpperCase() === upper || a.id === q || a.id.toUpperCase() === upper,
    ) ?? null
  );
}

export function getMockArtist(idOrCode: string): {
  artist: MockArtist;
  works: MockArtwork[];
} | null {
  const q = idOrCode.trim();
  const upper = q.toUpperCase();
  const artist =
    LOCAL_MOCK_ARTISTS.find(
      (a) => a.short_code.toUpperCase() === upper || a.id === q || a.id.toUpperCase() === upper,
    ) ?? null;
  if (!artist) return null;
  const works = LOCAL_MOCK_ARTWORKS.filter((w) => w.artist_id === artist.id);
  return { artist, works };
}
