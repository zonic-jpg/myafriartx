/**
 * Plain-language terms shown to sellers and buyers. DRAFT: a Nigerian lawyer should approve this wording
 * before the venue is switched on for real money. Bump BUYBACK_TERMS_VERSION in buyback.functions.ts
 * whenever the text changes, so each listing records which version was accepted.
 */
export const HOW_IT_WORKS = [
  { who: "Seller", does: "Lists a work they own, uploads proof of ownership, sets the price and (optionally) a buyback price and period. Hands the work over once paid." },
  { who: "Buyer", does: "Reserves a work, pays the seller directly, and confirms when the work arrives. Owns it outright from that moment." },
  { who: "MyAfriArt", does: "Venue only. Checks identity, publishes the listing, keeps the record of each step and charges flat fees. Does not value, store, guarantee, lend or hold the sale money." },
] as const;

export const SELLER_TERMS = [
  "I own this work outright and nothing is owed on it or pledged against it.",
  "I will hand the work to the buyer once their payment reaches me. Title passes to the buyer when they confirm receipt.",
  "The buyback is an option for me, not a debt. If I do not use it in time, the buyer keeps the work and I owe nothing further.",
  "The sale covers the physical work only. Copyright stays with the artist unless transferred in writing.",
  "MyAfriArt does not guarantee authenticity, value or title. What I have said about this work is my own statement.",
] as const;

export const BUYER_TERMS = [
  "I am buying this work from the seller, not from MyAfriArt. I have looked at the photos, provenance and documents and am satisfied.",
  "I will pay the seller directly and enter the transfer reference. I will confirm receipt when the work arrives.",
  "If the seller uses the buyback option in time and pays the buyback price, I will return the work and keep the price I was paid.",
  "MyAfriArt does not guarantee authenticity, value or title, and does not hold or return sale money.",
] as const;

export const ARTIST_NOTE =
  "Artists sell their own work as an ordinary sale. A buyback option is only available to collectors who own the work.";

export const STATUS_LABEL: Record<string, string> = {
  awaiting_fee: "Listing fee due",
  pending_review: "In review",
  rejected: "Not approved",
  open: "On offer",
  reserved: "Reserved",
  payment_sent: "Payment sent",
  paid: "Paid, hand-over due",
  handed_over: "On its way",
  sold: "Sold",
  exercise_sent: "Buyback payment sent",
  option_exercised: "Bought back",
  option_lapsed: "Sold, buyback ended",
  cancelled: "Withdrawn",
};
