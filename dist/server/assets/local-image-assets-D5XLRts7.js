const artistDefault = "/assets/artist-default-BGFszt32.jpg";
const paneArtist = "/assets/pane-artist-DiVrGIa8.jpg";
const paneAuction = "/assets/pane-auction-CbyWfVmp.jpg";
const paneEvent = "/assets/pane-event-CCVvHZ8u.jpg";
const paneLounge = "/assets/pane-lounge-dl6LJ9Zy.jpg";
const panePiece = "/assets/pane-piece-wWz9PgWM.jpg";
const paneStage = "/assets/pane-stage-Dzy-AhjY.jpg";
const localPaneAssets = {
  artist: paneArtist,
  event: paneEvent,
  piece: panePiece,
  stage: paneStage,
  auction: paneAuction,
  lounge: paneLounge
};
const localCatalogueAssets = [
  panePiece,
  paneArtist,
  paneEvent,
  paneStage,
  paneAuction,
  paneLounge
];
function localImageForKey(seed, index = 0) {
  const key = seed || "local-artwork";
  const hash = Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), index);
  return localCatalogueAssets[hash % localCatalogueAssets.length];
}
function localPaneImage(paneId) {
  return paneId ? localPaneAssets[paneId] ?? localImageForKey(paneId) : artistDefault;
}
export {
  artistDefault as a,
  localPaneImage as b,
  localPaneAssets as c,
  paneAuction as d,
  paneArtist as e,
  paneStage as f,
  localCatalogueAssets as g,
  localImageForKey as l,
  paneEvent as p
};
