import { describe, it, expect } from "vitest";
import { computeReviewEligibility } from "@/lib/review-eligibility-logic";

describe("computeReviewEligibility", () => {
  it("eligible only for buyer when order is delivered", () => {
    const r = computeReviewEligibility({
      orderDelivered: true,
      alreadyReviewed: false,
      isBuyer: true,
    });
    expect(r.eligible).toBe(true);
  });

  it("not eligible when reviewer is not buyer", () => {
    const r = computeReviewEligibility({
      orderDelivered: true,
      alreadyReviewed: false,
      isBuyer: false,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toContain("kupujúci");
  });

  it("not eligible when already reviewed", () => {
    const r = computeReviewEligibility({
      orderDelivered: true,
      alreadyReviewed: true,
      isBuyer: true,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toContain("Už ste hodnotili");
  });

  it("not eligible when order not delivered", () => {
    const r = computeReviewEligibility({
      orderDelivered: false,
      alreadyReviewed: false,
      isBuyer: true,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toContain("Doručené");
  });
});
