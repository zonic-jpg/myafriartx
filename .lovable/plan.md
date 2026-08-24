## Goal

Tighten the landing-page smart-search filter bar: drop Gender, fold Age/Price in with the other filter chips, replace the "Apply & Search" rectangle with a sleek circular arrow button, and put Reset right after it on the same row.

## Changes (single file: `src/routes/index.tsx`)

### 1. Remove Gender

- Remove `{ key: "gender", label: "Gender" }` from the `CHIPS` array (line 1372).
- Leave the underlying `genders` field in the schema, state, and matching logic untouched so existing URLs and data flows keep working — we are only hiding the chip from the UI as requested.

### 2. Age + Price join the chip row

- They are already in `CHIPS` (lines 1373-1374) and already render in the `CHIPS.map` loop. No data change needed — they will naturally appear on the same row as Country / City / Medium once the row layout below is updated.

### 3. New row structure

Replace the current Row 2 (lines 1473-1541) with a single horizontal row holding, in order:

1.  Smart search rectangle (unchanged styling)
2.  Country, City, Medium, Age, Price chips (same fixed-width rectangle styling)
3.  Circular outline arrow button (the new "go" action — replaces the old "Apply & Search" rectangle)
4.  Reset rectangle (existing styling, immediately after the arrow)

The outer `grid grid-cols-[...8.75rem]` wrapper (which reserved a second column for Reset under AI concierge) is removed, since Reset moves inline. Mobile: same `grid grid-cols-2` wrap behavior is preserved so chips reflow cleanly on narrow screens; the arrow + Reset sit at the end of the wrap.

### 4. Circular arrow button (new visual)

- Size: `h-9 w-9` (matches `controlH`) so it lines up vertically with the rectangles.
- Style: `rounded-full ring-1 ring-white/40 bg-transparent text-white hover:bg-white/10 transition` — same outline-only treatment as AI concierge, just circular.
- Icon: `ArrowRight` from `lucide-react` (size 16), centered.
- `onClick={() => onSubmit()}`, `aria-label="Apply filters and search"`.

### 5. Row 1 stays intact

Search input + AI concierge button on top row — no changes.

## Result

Two rows total:

- Row 1: search input + AI concierge
- Row 2: Smart search · Country · City · Medium · Age · Price · ◯→ · Reset

No backend, schema, or matching-logic changes.

## Out of scope

- The unrelated search-not-working complaint from earlier turns (not mentioned in this message; previous fix stands).
- Any change to the popover/sub-bar that opens when a chip is clicked.
