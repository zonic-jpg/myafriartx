/** Cross-app links in the ZonicMe ecosystem (footer). */

export const ZONIC_APPS = [
  { id: "myyangax", label: "MyYanga", href: "https://myyanga.com" },
  { id: "myafriartx", label: "MyAfriArt", href: "https://myafriart.com" },
  { id: "rubba", label: "Rubba", href: "https://myrubba.com" },
  { id: "adspotx", label: "AdSpot", href: "https://adspotng.com" },
  { id: "owanbex", label: "Owanbe", href: "https://myowanbe.com" },
  { id: "zonicme", label: "ZonicMe", href: "https://zonicme.com.ng" },
  { id: "sydef", label: "Sydef", href: "https://main.d30v1knuamflfh.amplifyapp.com" },
  { id: "confirmahead", label: "ConfirmAhead", href: "https://confirmahead.com" },
] as const;

export function siblingZonicApps(currentId: string) {
  const cur = String(currentId || "").toLowerCase();
  return ZONIC_APPS.filter((a) => a.id !== cur);
}
