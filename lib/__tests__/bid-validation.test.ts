import { describe, it, expect } from "vitest";
import {
  computeMinBid,
  validateBid,
} from "@/lib/bid-validation";

describe("computeMinBid", () => {
  it("returns start price when no top bid", () => {
    expect(computeMinBid(10, 1, null)).toBe(10);
    expect(computeMinBid(5.5, 0.5, null)).toBe(5.5);
  });

  it("returns topBid + minIncrement when there is a top bid", () => {
    expect(computeMinBid(10, 1, 10)).toBe(11);
    expect(computeMinBid(10, 1, 15)).toBe(16);
    expect(computeMinBid(5, 0.5, 7.5)).toBe(8);
  });
});

describe("validateBid", () => {
  const futureEnd = new Date(Date.now() + 60000);
  const pastEnd = new Date(Date.now() - 60000);

  it("accepts first bid >= start price when auction not ended", () => {
    const r = validateBid({
      startPrice: 10,
      minIncrement: 1,
      topBidAmount: null,
      amount: 10,
      auctionEndsAt: futureEnd,
    });
    expect(r.valid).toBe(true);
    expect(r.minBid).toBe(10);
  });

  it("rejects first bid below start price", () => {
    const r = validateBid({
      startPrice: 10,
      minIncrement: 1,
      topBidAmount: null,
      amount: 9,
      auctionEndsAt: futureEnd,
    });
    expect(r.valid).toBe(false);
    if (r.valid) throw new Error("Expected invalid result");
    expect(r.error).toContain("Minimálna ponuka");
    expect(r.minBid).toBe(10);
  });

  it("accepts bid >= topBid + minIncrement", () => {
    const r = validateBid({
      startPrice: 10,
      minIncrement: 1,
      topBidAmount: 20,
      amount: 21,
      auctionEndsAt: futureEnd,
    });
    expect(r.valid).toBe(true);
    expect(r.minBid).toBe(21);
  });

  it("rejects bid below topBid + minIncrement", () => {
    const r = validateBid({
      startPrice: 10,
      minIncrement: 1,
      topBidAmount: 20,
      amount: 20.5,
      auctionEndsAt: futureEnd,
    });
    expect(r.valid).toBe(false);
    expect(r.minBid).toBe(21);
  });

  it("rejects when auction has ended", () => {
    const r = validateBid({
      startPrice: 10,
      minIncrement: 1,
      topBidAmount: null,
      amount: 10,
      auctionEndsAt: pastEnd,
    });
    expect(r.valid).toBe(false);
    if (r.valid) throw new Error("Expected invalid result");
    expect(r.error).toContain("skončila");
  });

  it("accepts when auctionEndsAt is null", () => {
    const r = validateBid({
      startPrice: 10,
      minIncrement: 1,
      topBidAmount: null,
      amount: 10,
      auctionEndsAt: null,
    });
    expect(r.valid).toBe(true);
  });
});
