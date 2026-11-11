import { describe, expect, it } from "vitest";
import {
  increment,
  minNextBid,
  reserveMet,
  applyBid,
  settle,
  buyersPremium,
  settlementChargeNgn,
} from "../src/lib/auction-engine";

const baseLot = {
  id: "1",
  code: "LOT-1",
  title: "Test",
  artist: "Artist",
  medium: "Oil",
  image: null,
  description: "",
  estimateLow: 100_000,
  estimateHigh: 200_000,
  startingBid: 50_000,
  reserve: 80_000,
  currentBid: 0,
  bidCount: 0,
  leadingBidderId: null,
  leadingBidderName: null,
  status: "live" as const,
  endsAt: Date.now() + 60_000,
};

describe("auction-engine", () => {
  it("increment ladder", () => {
    expect(increment(50_000)).toBe(5_000);
    expect(increment(600_000)).toBe(25_000);
  });

  it("minNextBid first bid uses starting", () => {
    expect(minNextBid({ currentBid: 0, startingBid: 50_000, bidCount: 0 })).toBe(50_000);
  });

  it("reserveMet respects server flag", () => {
    expect(reserveMet({ currentBid: 50_000, reserve: 80_000, bidCount: 1, reserveMet: true })).toBe(
      true,
    );
    expect(reserveMet({ currentBid: 50_000, reserve: 80_000, bidCount: 1 })).toBe(false);
  });

  it("applyBid rejects low bid", () => {
    const r = applyBid(baseLot, "u1", "Alice", 10_000);
    expect(r.ok).toBe(false);
  });

  it("applyBid accepts valid bid", () => {
    const r = applyBid(baseLot, "u1", "Alice", 50_000);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.lot.currentBid).toBe(50_000);
      expect(r.lot.leadingBidderId).toBe("u1");
    }
  });

  it("settle sold when reserve met", () => {
    const lot = { ...baseLot, currentBid: 100_000, bidCount: 2 };
    expect(settle(lot).status).toBe("sold");
  });

  it("buyersPremium 20%", () => {
    const { premium, total } = buyersPremium(1_000_000);
    expect(premium).toBe(200_000);
    expect(total).toBe(1_200_000);
  });
});

describe("settlementChargeNgn (what the winner is actually charged)", () => {
  const sold = { status: "sold", current_bid: 1_000_000, leading_bidder: "u1", payment_id: null };
  it("charges hammer + 20% premium", () => {
    expect(settlementChargeNgn(sold, "u1")).toBe(1_200_000);
  });
  it("matches the checkout summary total for odd amounts (rounding)", () => {
    for (const hammer of [1, 3, 7, 55_005, 104_999, 333_333, 9_999_999]) {
      expect(settlementChargeNgn({ ...sold, current_bid: hammer }, "u1")).toBe(
        buyersPremium(hammer).total,
      );
    }
  });
  it("accepts numeric strings from the database", () => {
    expect(settlementChargeNgn({ ...sold, current_bid: "250000" }, "u1")).toBe(300_000);
  });
  it("refuses a live lot, a non-winner, a paid lot and bad amounts", () => {
    expect(() => settlementChargeNgn({ ...sold, status: "live" }, "u1")).toThrow(/not ready/);
    expect(() => settlementChargeNgn(sold, "u2")).toThrow(/winning bidder/);
    expect(() => settlementChargeNgn({ ...sold, leading_bidder: null }, "u1")).toThrow(
      /winning bidder/,
    );
    expect(() => settlementChargeNgn({ ...sold, payment_id: "p1" }, "u1")).toThrow(
      /already been paid/,
    );
    expect(() => settlementChargeNgn({ ...sold, current_bid: 0 }, "u1")).toThrow(/unavailable/);
    expect(() => settlementChargeNgn({ ...sold, current_bid: null }, "u1")).toThrow(/unavailable/);
    expect(() => settlementChargeNgn({ ...sold, current_bid: "abc" }, "u1")).toThrow(/unavailable/);
  });
});

describe("auction math invariants", () => {
  it("increment ladder boundaries", () => {
    const cases: Array<[number, number]> = [
      [0, 5_000],
      [99_999, 5_000],
      [100_000, 10_000],
      [499_999, 10_000],
      [500_000, 25_000],
      [999_999, 25_000],
      [1_000_000, 50_000],
      [4_999_999, 50_000],
      [5_000_000, 100_000],
      [19_999_999, 100_000],
      [20_000_000, 250_000],
    ];
    for (const [bid, inc] of cases) expect(increment(bid)).toBe(inc);
  });
  it("premium + hammer always equals total and is an integer", () => {
    for (let h = 1; h < 2000; h += 7) {
      const r = buyersPremium(h);
      expect(Number.isInteger(r.premium)).toBe(true);
      expect(r.hammer + r.premium).toBe(r.total);
    }
  });
});
