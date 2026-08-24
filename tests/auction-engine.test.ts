import { describe, expect, it } from "vitest";
import {
  increment,
  minNextBid,
  reserveMet,
  applyBid,
  settle,
  buyersPremium,
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
