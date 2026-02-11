import { describe, expect, it } from "vitest";

import { canTransitionOrder } from "@/lib/order-state-machine";

describe("canTransitionOrder", () => {
  it("allows seller to accept price from negotiating", () => {
    const result = canTransitionOrder({
      from: "negotiating",
      to: "price_accepted",
      actor: "seller",
    });

    expect(result.allowed).toBe(true);
  });

  it("rejects buyer when trying to accept price", () => {
    const result = canTransitionOrder({
      from: "negotiating",
      to: "price_accepted",
      actor: "buyer",
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("predajca");
  });

  it("requires shipping address for address_provided transition", () => {
    const result = canTransitionOrder({
      from: "price_accepted",
      to: "address_provided",
      actor: "buyer",
      hasShippingAddress: false,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("adresa");
  });

  it("allows seller to mark shipped only after address is provided", () => {
    const ok = canTransitionOrder({
      from: "address_provided",
      to: "shipped",
      actor: "seller",
    });
    const blocked = canTransitionOrder({
      from: "price_accepted",
      to: "shipped",
      actor: "seller",
    });

    expect(ok.allowed).toBe(true);
    expect(blocked.allowed).toBe(false);
  });

  it("allows delivered only for buyer after shipped", () => {
    const sellerAttempt = canTransitionOrder({
      from: "shipped",
      to: "delivered",
      actor: "seller",
    });
    const buyerAttempt = canTransitionOrder({
      from: "shipped",
      to: "delivered",
      actor: "buyer",
    });

    expect(sellerAttempt.allowed).toBe(false);
    expect(buyerAttempt.allowed).toBe(true);
  });
});
