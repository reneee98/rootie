import { describe, it, expect } from "vitest";
import {
  listingThreadKey,
  wantedThreadKey,
  directThreadKey,
} from "@/lib/thread-keys";

describe("listingThreadKey", () => {
  it("produces same key for (buyer, seller) and (seller, buyer)", () => {
    const a = "user-a-id";
    const b = "user-b-id";
    const listingId = "listing-1";
    expect(listingThreadKey(listingId, a, b)).toBe(
      listingThreadKey(listingId, b, a)
    );
    expect(listingThreadKey(listingId, a, b)).toBe(
      "listing:listing-1:user-a-id:user-b-id"
    );
  });

  it("different listings produce different keys for same users", () => {
    const k1 = listingThreadKey("listing-1", "u1", "u2");
    const k2 = listingThreadKey("listing-2", "u1", "u2");
    expect(k1).not.toBe(k2);
  });
});

describe("wantedThreadKey", () => {
  it("produces same key for (offerer, owner) and (owner, offerer)", () => {
    const offerer = "offerer-id";
    const owner = "owner-id";
    const wantedId = "wanted-1";
    expect(wantedThreadKey(wantedId, offerer, owner)).toBe(
      wantedThreadKey(wantedId, owner, offerer)
    );
  });

  it("different wanted requests produce different keys", () => {
    const k1 = wantedThreadKey("wanted-1", "u1", "u2");
    const k2 = wantedThreadKey("wanted-2", "u1", "u2");
    expect(k1).not.toBe(k2);
  });
});

describe("directThreadKey", () => {
  it("produces same key for (A, B) and (B, A)", () => {
    const a = "user-a";
    const b = "user-b";
    expect(directThreadKey(a, b)).toBe(directThreadKey(b, a));
    expect(directThreadKey(a, b)).toMatch(/^direct:/);
  });

  it("different user pairs produce different keys", () => {
    const k1 = directThreadKey("a", "b");
    const k2 = directThreadKey("a", "c");
    const k3 = directThreadKey("b", "c");
    expect(k1).not.toBe(k2);
    expect(k2).not.toBe(k3);
    expect(k1).not.toBe(k3);
  });
});
