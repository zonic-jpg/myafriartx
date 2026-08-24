# MyAfriart / ArtStage — Business Capabilities Document

**Version:** 1.0 · **Date:** 16 July 2026 · **Status:** Production build v4 (Ship-Complete + Compliance)

---

## 1. Executive Summary

MyAfriart is a full-stack marketplace and services platform for African art. It combines
four revenue-generating businesses on one codebase:

1. **A curated marketplace** — direct sales of catalogued works
2. **A timed auction house** — run to international auction standards
3. **A brokered private-sale floor** ("the Sale Lounge") — with escrow and certification
4. **An art-backed collateral registry** — the foundation for art-secured lending

These are wrapped in a trust infrastructure (identity verification, escrow, provenance,
certificates, disputes) that most regional competitors do not have. **The trust layer is
the moat**: anyone can list art online; very few platforms can make a stranger-to-stranger
₦5m art transaction feel safe.

---

## 2. Capability Map

### 2.1 Discovery & Catalogue

| Functionality | What it does |
|---|---|
| Curated catalogue | Browsable inventory of artworks and artists with country allocation controls |
| Piece detail pages | Short-code addressed pages with price, medium, palette, provenance status, view counts |
| Artist profiles | Biography, portfolio, country and era metadata |
| AI concierge chat | On-site assistant that guides visitors to artists, auctions, and tools |

**Business benefits**

- **Zero-friction top of funnel.** Every artwork has a shareable URL with rich metadata —
  each piece page is a landing page for social and search traffic.
- **Merchandising control.** Country-allocation settings let the business shape the
  catalogue mix (e.g. 40% Nigerian, 20% Ghanaian) without engineering involvement.
- **View-count analytics** on pieces and artists tell you what to acquire, promote, and
  price up — inventory decisions driven by demand data, not guesswork.

### 2.2 AI Room Staging (the Studio)

| Functionality | What it does |
|---|---|
| Room staging | Buyer uploads a photo of their wall; AI places any artwork at true scale |
| Device-aware rendering | Output sized for the buyer's actual room and screen |

**Business benefits**

- **Converts hesitation into purchase.** The #1 objection in online art buying is
  *"will it suit my space?"* Staging answers it visually before the buyer has to imagine anything.
- **Differentiator with pull marketing built in.** Staged-room images are inherently
  shareable — every render a buyer posts is an advert with your artwork in it.
- **Upsell surface.** Staging sessions reveal wall size and taste; that data feeds
  recommendations and notification reels.

### 2.3 Live Timed Auctions

| Functionality | What it does |
|---|---|
| Timed lots | Server-persisted auction lots with estimates, reserves, and countdowns |
| Bid-increment ladder | Standard ascending increments (₦5k → ₦250k bands), enforced server-side |
| Anti-sniping soft close | Bids in the final 2 minutes extend the lot — same rules as Christie's/Sotheby's timed sales |
| Hidden reserves | Reserve status shown, amount concealed — industry standard |
| Buyer's premium | 20% premium calculated on the hammer price |
| Automated settlement | Cron-driven closing: sold if reserve met, passed if not |
| Unpaid-winner handling | Winners get a 72-hour payment deadline; unpaid lots automatically relist |

**Business benefits**

- **Price discovery + urgency = higher realised prices.** Auctions routinely clear above
  fixed-price listings for desirable works; the soft close specifically prevents snipers
  from suppressing final prices.
- **The buyer's premium is a 20% revenue line** on every hammer, on top of any seller commission.
- **Credibility with consignors.** Running recognisably professional rules (increments,
  reserves, premiums) is what convinces serious collectors and estates to consign
  through you rather than ship to Lagos/London auction houses.
- **Zero manual settlement labour.** Expired lots settle themselves; unpaid winners are
  automatically cycled out — no staff chasing deadbeat bidders before relisting.

### 2.4 Direct Sales ("Buy Now")

| Functionality | What it does |
|---|---|
| One-click checkout | Buy now on any priced piece via Paystack (cards, bank, USSD) |
| Payment verification | Dual confirmation: redirect callback + signed webhook |
| Automatic fulfilment | Successful payment marks the work sold and writes a provenance event atomically |

**Business benefits**

- **Captures the impulse buyer** who won't wait for an auction or negotiate in the Lounge.
- **Paystack coverage means Nigerian buyers pay how they actually pay** — cards, transfers,
  USSD — not just international rails.
- **No phantom sales, no lost payments.** The webhook + idempotency architecture means a
  payment is either fully recorded (sold + provenance + receipt) or not at all. This is
  the difference between a marketplace and a spreadsheet with a payment link.

### 2.5 The Sale Lounge (Private Sales Floor)

| Functionality | What it does |
|---|---|
| Members-only floor | Sign-in gated listing board: "selling" and "looking for" posts |
| Private messaging | Real-time buyer–seller threads per listing |
| Brokerage on demand | Either party can request MyAfriart brokerage at a configurable fee (default 5%) |
| Escrow payments | Buyers pay into escrow; funds held until admin release on confirmed delivery |

**Business benefits**

- **Serves the market segment that hates public prices.** High-value African art trades
  privately; the Lounge digitises the WhatsApp-and-handshake market you're competing with.
- **Brokerage fee income on peer-to-peer deals** you didn't source — the platform monetises
  transactions between members.
- **Escrow is the conversion unlock.** Strangers don't wire ₦3m to strangers. Held funds
  with platform release is what turns lurkers into transactors — and every escrow deal
  passes through your fee gate.
- **Network effects.** Every buyer post ("looking for mid-century Yoruba bronze") is
  demand data and a reason for sellers to join.

### 2.6 Brokerage, Certification & Public Verification

| Functionality | What it does |
|---|---|
| Brokerage workflow | Admin-managed pipeline: requested → verified → in transit → delivered → certified |
| PDF certificates | Branded Certificates of Authenticity generated per brokered transaction |
| Certificate registry | Every certificate gets a unique verify code stored server-side |
| Public verification | Anyone can check a certificate at `/verify/cert/{code}` — no account needed |

**Business benefits**

- **The certificate is a product, not paperwork.** Authentication + delivery monitoring +
  certification is a service worth its brokerage fee on its own.
- **Public verification makes your certificates liquid.** A collector reselling a
  MyAfriart-certified work can point any future buyer at the verify URL. Your paper
  travels with the artwork forever — and every verification is a branded touchpoint with
  someone new who is, by definition, an art buyer.
- **Forgery defence.** Codes are server-registered and revocable; a faked PDF fails the
  public check. This protects the brand from the fraud that plagues the art trade.

### 2.7 Provenance Ledger

| Functionality | What it does |
|---|---|
| Ownership chain | Immutable event log per artwork: sales, transfers, certifications |
| Automatic recording | Every fulfilled payment writes a provenance event in the same transaction |

**Business benefits**

- **Provenance is price.** Documented history materially raises resale value — works
  sold through MyAfriart become worth more *because* they were sold through MyAfriart,
  which is a structural reason for sellers to prefer your platform.
- **Future secondary-market royalties.** A tracked ownership chain is the prerequisite
  for artist resale royalties — a program that would be a first-mover differentiator for
  African artists and a press story on its own.

### 2.8 Art-Backed Collateral Registry

| Functionality | What it does |
|---|---|
| Collateral portal | Verified members pledge works with appraised value and requested loan amount |
| Authentication workflow | Admin pipeline: pending → authenticated → active → released/rejected |
| Lien flags | Pledged artworks are marked and cannot be sold until the lien is released |
| KYC gate | Pledging is hard-blocked without a verified identity |

**Business benefits**

- **Opens an entirely new category.** Art-as-collateral is a multi-billion-dollar business
  globally (Sotheby's Financial, Athena Art Finance) and effectively non-existent for
  African art. This is the platform's expansion story for investors.
- **Deepens lock-in.** A collector with a pledged work is a multi-year relationship,
  not a one-off transaction.
- **Lien registry prevents double-spending fraud** — a pledged work physically cannot be
  sold or re-pledged through the platform. That integrity is what a lending partner
  (bank, credit fund) will require before putting capital behind the product.
- **Decision point:** the platform is built as the *registry and workflow*; whether
  MyAfriart lends its own capital, brokers to a partner lender, or charges
  registry/authentication fees is a business-model choice the code already supports.

### 2.9 Identity Verification (KYC)

| Functionality | What it does |
|---|---|
| Member verification | NIN, passport, driver's licence, or voter's card + document upload |
| Secure document handling | Private storage, magic-byte file validation, admin-only 10-minute signed URLs |
| Review queue | Admin approve/reject with mandatory rejection reasons; members can resubmit |
| Risk-based enforcement | Required for all collateral pledging and for escrow payments ≥ ₦500,000 (tunable) |

**Business benefits**

- **Regulatory survival.** Art dealing + payments + lending sits inside Nigeria's AML/CFT
  perimeter (SCUML registration for art dealers). Demonstrable KYC is what keeps the
  platform bankable — payment processors and lending partners will ask for exactly this.
- **Fraud cost avoidance.** Verified identities on high-value flows cut chargeback fraud,
  stolen-art pledging, and money-laundering exposure — losses that would otherwise come
  straight off the bottom line.
- **Risk-based friction.** Casual buyers browse and buy small without paperwork; only
  high-value and lending flows demand verification. Compliance without killing conversion.
- **Trust as marketing.** "Verified members" is now a claim the platform can truthfully make.

### 2.10 Dispute Resolution

| Functionality | What it does |
|---|---|
| Member dispute filing | Any completed payment can be disputed in-app with a reasoned claim |
| Escrow freeze | Opening a dispute instantly freezes any held escrow funds |
| Atomic resolution | Admin resolves with one action: refund escrow + mark payment refunded in a single transaction |
| Audit trail | Every dispute records who opened it, why, who resolved it, and the outcome |

**Business benefits**

- **Keeps conflict inside the house.** Without in-app recourse, an unhappy buyer's next
  stops are their bank (chargeback — you lose the money *and* pay the penalty) or social
  media (you lose the brand). A dispute button is dramatically cheaper than either.
- **Escrow freeze protects the platform's credibility** — no seller gets paid out while a
  delivery is contested, so "escrow" means what buyers think it means.
- **The audit trail is your defence file** for payment-processor investigations and any
  future regulatory review.

### 2.11 Notifications & Sample Reels

| Functionality | What it does |
|---|---|
| Preference-based reels | Members receive curated artwork reels matched to stated tastes |
| Frequency capping | Admin-controlled maximum sends per week |
| Sponsor slots | Weighted sponsor panes can be sold into reels |

**Business benefits**

- **Owned re-engagement channel** — reactivates dormant members without paying for ads.
- **Sponsor panes are sellable ad inventory** inside a high-intent, art-only audience.
- **Frequency caps protect the asset** — the channel stays valuable because it isn't spammed.

### 2.12 Content Studio (No-Code Site Management)

| Functionality | What it does |
|---|---|
| Visual page editor | Admins edit headline copy and hero imagery per page with live preview |
| Device-aware media | Uploads auto-generate mobile/tablet/desktop sizes |
| Server persistence | Published content stored centrally; live for all visitors instantly |

**Business benefits**

- **Marketing moves at marketing speed.** Campaign copy, seasonal heroes, and message
  tests ship in minutes with zero engineering cost per change.
- **No agency dependency** for routine site updates.

### 2.13 Admin Operations Suite

| Functionality | What it does |
|---|---|
| Unified console | Fifteen operational tabs: catalogue, artists, styles, panes, allocation, transactions, analytics, brokerage, collateral, KYC, disputes, content, settings |
| Role-gated access | Admin role enforced server-side on every operation |
| Transaction lookup | Every payment, brokerage deal, and pledge is traceable by short code |

**Business benefits**

- **One person can run the platform.** All daily operations — approving pledges, reviewing
  IDs, resolving disputes, issuing certificates, editing the site — live in a single console.
  Headcount scales with transaction volume, not with feature count.
- **Every money-touching action is attributable** to a named admin — the internal-controls
  posture investors and auditors expect.

### 2.14 Trust & Security Infrastructure (Invisible but Priced-In)

| Functionality | What it does |
|---|---|
| Webhook integrity | HMAC-SHA512 signature verification + idempotent event log — payments can't be spoofed or double-processed |
| Rate limiting | 120 requests/minute per IP on all APIs — scraping and abuse throttled |
| Row-level security | Database-enforced access: members see their own data, admins see everything, nobody sees more |
| Malware-scanned uploads | Magic-byte validation on all uploads; optional VirusTotal scanning |
| Aggressive audit gate | 59-check hostile audit script (`npm run audit:aggressive`) runs tests, build, secret scans, and security assertions — currently 100/100 |

**Business benefits**

- **This is what "production-grade" means commercially:** the platform can pass a payment
  processor's onboarding review, a partner bank's technical due diligence, and an
  acquirer's security questionnaire. Each of those gates unlocks revenue the features
  alone cannot.
- **The audit gate keeps it that way** — every future release must pass the same 59
  hostile checks before it ships, so quality is enforced, not aspirational.

---

## 3. Revenue Model Summary

| Revenue stream | Powered by | Mechanics |
|---|---|---|
| Buyer's premium | Auctions | 20% on every hammer price |
| Direct sale margin/commission | Buy Now checkout | Platform-set pricing on catalogue works |
| Brokerage fees | Sale Lounge | Default 5% (admin-tunable) on brokered private sales |
| Escrow-enabled deal flow | Escrow + disputes | Trust layer converts P2P deals that would otherwise die |
| Certification services | Certificate registry | Authentication + certification as a paid service |
| Collateral/registry fees | Collateral portal + liens | Authentication fees today; lending margin or partner-referral fees tomorrow |
| Sponsor inventory | Notification reels | Weighted sponsor slots in curated reels |

**Compounding effect:** each trust capability raises the ceiling on the others. KYC makes
escrow safe at higher values → escrow makes the Lounge liquid → Lounge volume feeds
brokerage and certification → certificates and provenance raise resale values → higher
values justify collateral lending → lending locks in the collectors who consign the best
auction lots.

---

## 4. Compliance & Risk Posture

| Area | Status |
|---|---|
| Identity verification | Live — risk-based (collateral: always; escrow ≥ ₦500k) |
| AML surface | KYC records + full payment audit trail + attributable admin actions |
| Payment integrity | Signed webhooks, idempotent processing, atomic fulfilment |
| Buyer protection | Escrow, freeze-on-dispute, atomic refunds |
| Honest marketing | Copy audited — no "verified" claims beyond what the platform enforces |
| Data protection | Private KYC storage, time-limited signed URLs, RLS throughout |

**Open items requiring business (not engineering) action:**

1. **Paystack live credentials** and production webhook registration — turns payments on.
2. **SCUML/regulatory registration** as an art dealer — legal counsel task.
3. **Lending model decision** — own capital vs. partner lender vs. registry-fees-only.
4. **Insurance** for works in transit under brokerage — negotiate a carrier partnership.

---

## 5. One-Line Positioning

> **MyAfriart is the only platform where African art can be discovered, staged on your
> wall, bought, auctioned, brokered, certified, verified, and borrowed against — with
> bank-grade trust infrastructure under every transaction.**
