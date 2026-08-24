import artistDefault from "@/assets/artist-default.jpg";
import paneArtist from "@/assets/pane-artist.jpg";
import paneAuction from "@/assets/pane-auction.jpg";
import paneEvent from "@/assets/pane-event.jpg";
import paneLounge from "@/assets/pane-lounge.jpg";
import panePiece from "@/assets/pane-piece.jpg";
import paneStage from "@/assets/pane-stage.jpg";

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

export function localPaneImage(paneId: string | null | undefined) {
  return paneId ? (localPaneAssets[paneId] ?? localImageForKey(paneId)) : artistDefault;
}

export { artistDefault, paneArtist, paneAuction, paneEvent, paneLounge, panePiece, paneStage };
