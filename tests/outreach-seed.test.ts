import { describe, expect, it } from "vitest";
import { OUTREACH_ARTIST_SEEDS } from "../src/lib/outreach-artists.data";
import { OUTREACH_WORK_SEEDS } from "../src/lib/outreach-works.data";

describe("outreach artist seeds", () => {
  it("seeds at least 250 unique regional + Nigerian profiles", () => {
    expect(OUTREACH_ARTIST_SEEDS.length).toBeGreaterThanOrEqual(250);
    const codes = new Set(OUTREACH_ARTIST_SEEDS.map((a) => a.short_code));
    expect(codes.size).toBe(OUTREACH_ARTIST_SEEDS.length);
  });

  it("marks every seed as unclaimed outreach via generator columns", () => {
    for (const a of OUTREACH_ARTIST_SEEDS) {
      expect(a.short_code).toMatch(/^ART-OUT-/);
      expect(a.name.length).toBeGreaterThan(0);
    }
  });

  it("links works to known artist codes with valid slots", () => {
    const codes = new Set(OUTREACH_ARTIST_SEEDS.map((a) => a.short_code));
    for (const w of OUTREACH_WORK_SEEDS) {
      expect(codes.has(w.artist_short_code)).toBe(true);
      expect(w.slot).toBeGreaterThanOrEqual(1);
      expect(w.slot).toBeLessThanOrEqual(5);
      if (w.image_url) expect(w.image_url.startsWith("https://")).toBe(true);
    }
  });

  it("meets country minimums for expanded regions", () => {
    const counts: Record<string, number> = {};
    for (const a of OUTREACH_ARTIST_SEEDS) {
      counts[a.country ?? "Unknown"] = (counts[a.country ?? "Unknown"] ?? 0) + 1;
    }
    expect(counts.Nigeria).toBeGreaterThanOrEqual(60);
    expect(counts.Ghana).toBeGreaterThanOrEqual(15);
    expect(counts.Kenya).toBeGreaterThanOrEqual(15);
    expect(counts.Botswana).toBeGreaterThanOrEqual(20);
    expect((counts["Democratic Republic of the Congo"] ?? 0) + (counts["Republic of the Congo"] ?? 0)).toBeGreaterThanOrEqual(10);
  });
});
