import artistDefault from "@/assets/artist-default.jpg";
import paneArtist from "@/assets/pane-artist.jpg";
import paneAuction from "@/assets/pane-auction.jpg";
import paneEvent from "@/assets/pane-event.jpg";
import paneLounge from "@/assets/pane-lounge.jpg";
import panePiece from "@/assets/pane-piece.jpg";
import paneStage from "@/assets/pane-stage.jpg";

/** Stable public-path fallbacks (copied into dist/client/media on deploy). */
export const publicPaneAssets: Record<string, string> = {
  artist: "/media/pane-artist.jpg",
  event: "/media/pane-event.jpg",
  piece: "/media/pane-piece.jpg",
  stage: "/media/pane-stage.jpg",
  auction: "/media/pane-auction.jpg",
  lounge: "/media/pane-lounge.jpg",
};

export const localPaneAssets: Record<string, string> = {
  artist: paneArtist,
  event: paneEvent,
  piece: panePiece,
  stage: paneStage,
  auction: paneAuction,
  lounge: paneLounge,
};

export const localCatalogueAssets = [
  panePiece,
  paneArtist,
  paneEvent,
  paneStage,
  paneAuction,
  paneLounge,
];

export function localImageForKey(seed: string | null | undefined, index = 0) {
  const key = seed || "local-artwork";
  const hash = Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), index);
  return localCatalogueAssets[hash % localCatalogueAssets.length];
}

// ── Deterministic generative artwork ────────────────────────────────────────
// Sample (mock) pieces used to share six stock pane photos, so most artists
// ended up showing the same picture. Every sample piece now gets its own
// abstract composition, derived from its id, so no two look alike.
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let a = hashSeed(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ART_PALETTES: string[][] = [
  ["#C8412B", "#F2A83B", "#1F6F5C", "#16213E", "#F4EBD9"],
  ["#2B4C7E", "#E4572E", "#F3D250", "#1B1B1E", "#EDE6DB"],
  ["#7A1F3D", "#E8A33D", "#2E7D6B", "#101820", "#F6EFE2"],
  ["#0F4C5C", "#E36414", "#FB8B24", "#5F0F40", "#F5ECDC"],
  ["#3D5A40", "#D9A441", "#A63D2F", "#222831", "#F1E9DA"],
  ["#5B2A86", "#F26B38", "#2EC4B6", "#1D1D2B", "#F8F0E3"],
  ["#9C2C77", "#F9A03F", "#1A8FE3", "#2B2D42", "#F7EFE5"],
  ["#264653", "#E9C46A", "#E76F51", "#2A9D8F", "#F4EDE0"],
];

export function artworkPalette(seed: string): string[] {
  return ART_PALETTES[hashSeed(seed) % ART_PALETTES.length];
}

export function generativeArtworkUri(seed: string | null | undefined): string {
  const key = seed || "artwork";
  const r = rng(key);
  const pal = artworkPalette(key);
  const W = 800;
  const H = 1000;
  const bg = pal[4];
  const parts: string[] = [`<rect width="${W}" height="${H}" fill="${bg}"/>`];
  const blocks = 7 + Math.floor(r() * 6);
  for (let i = 0; i < blocks; i++) {
    const c = pal[Math.floor(r() * 4)];
    const x = Math.round(r() * W * 0.8);
    const y = Math.round(r() * H * 0.8);
    const w = Math.round(80 + r() * W * 0.5);
    const h = Math.round(80 + r() * H * 0.45);
    const kind = r();
    const op = (0.72 + r() * 0.28).toFixed(2);
    if (kind < 0.45) {
      const rot = Math.round((r() - 0.5) * 24);
      parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.round(r() * 14)}" fill="${c}" opacity="${op}" transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"/>`);
    } else if (kind < 0.75) {
      parts.push(`<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.round(Math.min(w, h) / 2.2)}" fill="${c}" opacity="${op}"/>`);
    } else {
      const x2 = Math.round(r() * W);
      const y2 = Math.round(r() * H);
      parts.push(`<path d="M${x} ${y} Q${x2} ${y2} ${x + w} ${y + h}" stroke="${c}" stroke-width="${Math.round(10 + r() * 34)}" fill="none" stroke-linecap="round" opacity="${op}"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${parts.join("")}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function localPaneImage(paneId: string | null | undefined) {
  if (!paneId) return artistDefault;
  return localPaneAssets[paneId] ?? publicPaneAssets[paneId] ?? localImageForKey(paneId);
}

export { artistDefault, paneArtist, paneAuction, paneEvent, paneLounge, panePiece, paneStage };
