/**
 * Letter Studio templates.
 *
 * Every audience listed here is selectable in the studio, allowed by the
 * `letters_sent.audience` check constraint, and guaranteed to build a full body —
 * `letterTemplate()` never returns undefined, so selecting a type can no longer
 * render an empty letter.
 */
export const ORG = "MyAfriArt (ZonicMe Limited)";
export const AUDIENCE_DESCRIPTION = "collectors and lovers of African art";

export type LetterAudience =
  | "permission"
  | "collaboration"
  | "advertising"
  | "artist_invite"
  | "sponsorship"
  | "press";

export type LetterTemplate = {
  id: LetterAudience;
  label: string;
  blurb: string;
  /** How the recipient is addressed when only a brand name is known. */
  role: string;
  subject: (brand: string) => string;
  cta: string;
  build: (brand: string) => string[];
};

const TEMPLATE_LIST: LetterTemplate[] = [
  {
    id: "permission",
    label: "Content permission",
    blurb: "Ask an artist or gallery for consent to feature their work.",
    role: "creative",
    subject: (brand) => `Permission to feature ${brand} on MyAfriArt`,
    cta: "Reply to grant permission, or ask us for the consent terms first.",
    build: (brand) => [
      `We are writing from ${ORG} regarding ${brand}. We admire your work and would like your permission to feature it on MyAfriArt, our platform for ${AUDIENCE_DESCRIPTION}.`,
      `Featuring is free and opt-in. With your consent we would display the work with full attribution, alongside only the details you approve. You may withdraw at any time and we will remove the listing on request.`,
      `If you are happy to proceed, simply reply — we would be glad to send our short content and consent terms for your review first.`,
    ],
  },
  {
    id: "collaboration",
    label: "Collaboration & support",
    blurb: "Propose a partnership or letter of support.",
    role: "partner",
    subject: (brand) => `Proposal for collaboration between ${ORG} and ${brand}`,
    cta: "Reply to arrange a conversation about working together.",
    build: (brand) => [
      `On behalf of ${ORG}, I write to propose a collaboration with ${brand}. MyAfriArt exists to grow Africa's art marketplace, and your work sits squarely within that mission.`,
      `We would welcome the opportunity to work together — a formal partnership, a letter of support, or a shared programme advancing African creative enterprise. We are happy to align on terms, attribution and any governance you require.`,
      `I would value a short conversation to explore what a partnership could look like. Please let me know a convenient time.`,
    ],
  },
  {
    id: "advertising",
    label: "Advertising invitation",
    blurb: "Invite a brand to advertise to our audience.",
    role: "brand",
    subject: (brand) => `Reach ${AUDIENCE_DESCRIPTION} on MyAfriArt`,
    cta: "Reply to receive placement options and rates.",
    build: (brand) => [
      `I'm reaching out from ${ORG} to invite ${brand} to advertise on MyAfriArt. Our audience — ${AUDIENCE_DESCRIPTION} — is precisely the kind of high-intent customer your brand wants to reach.`,
      `Placements are flexible: sponsored cards, category visibility, and performance options where you pay on results. Because we understand each person's interests, your brand is shown to people already looking for what you offer.`,
      `I'd be glad to share our placement options and rates, tailored to your objectives. Reply and I'll send details the same day.`,
    ],
  },
  {
    id: "artist_invite",
    label: "Artist invitation",
    blurb: "Invite an artist to claim a profile and list work.",
    role: "artist",
    subject: (brand) => `An invitation for ${brand} to join MyAfriArt`,
    cta: "Reply and we will set up your profile the same week.",
    build: (brand) => [
      `I am writing from ${ORG} to invite ${brand} to join MyAfriArt as a listed artist. We are building the place where ${AUDIENCE_DESCRIPTION} come to discover and buy African work with proper provenance.`,
      `Listing is free to start. You keep ownership and pricing control, we handle discovery, certificates of authenticity, and the introduction to buyers. Our virtual staging tool also lets a collector see your piece on their own wall before they commit.`,
      `If this is of interest, reply and we will create your profile, upload your first works with you, and share the listing terms in plain language.`,
    ],
  },
  {
    id: "sponsorship",
    label: "Sponsorship request",
    blurb: "Ask an institution or corporate to sponsor a programme.",
    role: "sponsor",
    subject: (brand) => `Sponsorship opportunity with ${ORG} for ${brand}`,
    cta: "Reply to receive the sponsorship pack and costings.",
    build: (brand) => [
      `On behalf of ${ORG}, I am writing to invite ${brand} to sponsor our next programme of exhibitions, artist residencies and collector events across the continent.`,
      `Sponsorship places your brand alongside a curated African art programme reaching ${AUDIENCE_DESCRIPTION}, with named recognition on the platform, at events, and in the accompanying editorial. Packages can be scaled to a single event or a full season.`,
      `I would be glad to send the sponsorship pack, including audience figures, recognition tiers and costings, for your consideration.`,
    ],
  },
  {
    id: "press",
    label: "Press & media",
    blurb: "Offer a story, interview or review to a publication.",
    role: "editor",
    subject: (brand) => `Story idea for ${brand}: the market for African art`,
    cta: "Reply if you would like the press kit, images or an interview.",
    build: (brand) => [
      `I am writing from ${ORG} with a story idea for ${brand}. MyAfriArt is opening the African art market to ${AUDIENCE_DESCRIPTION}, with verified provenance, live auctions and virtual staging that lets a buyer see a work on their own wall.`,
      `We can offer interviews with the artists we represent, high-resolution images cleared for editorial use, and data on how African work is being discovered and bought online.`,
      `If this fits your desk, reply and I will send the press kit and arrange any interview you would like.`,
    ],
  },
];

export const LETTER_TEMPLATES: Record<LetterAudience, LetterTemplate> = Object.fromEntries(
  TEMPLATE_LIST.map((t) => [t.id, t]),
) as Record<LetterAudience, LetterTemplate>;

export const LETTER_AUDIENCES = TEMPLATE_LIST.map((t) => t.id);

/** Always returns a complete template, even for a stale or unknown id. */
export function letterTemplate(id: string | null | undefined): LetterTemplate {
  return LETTER_TEMPLATES[(id ?? "") as LetterAudience] ?? LETTER_TEMPLATES.permission;
}

export function letterGreeting(template: LetterTemplate, proprietor: string, brand: string): string {
  const named = String(proprietor ?? "").trim();
  if (named) return named;
  const company = String(brand ?? "").trim();
  return company ? `The ${template.role} at ${company}` : "Sir or Madam";
}
