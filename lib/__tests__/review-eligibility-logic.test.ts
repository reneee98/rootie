import { describe, it, expect } from "vitest";
import {
  computeReviewEligibility,
  ELIGIBILITY_MESSAGE_THRESHOLD,
} from "@/lib/review-eligibility-logic";

describe("computeReviewEligibility", () => {
  it("eligible when both sent >= N messages, order delivered, not already reviewed", () => {
    const r = computeReviewEligibility({
      messageCountSelf: ELIGIBILITY_MESSAGE_THRESHOLD,
      messageCountOther: ELIGIBILITY_MESSAGE_THRESHOLD,
      dealConfirmed: false,
      orderDelivered: true,
      alreadyReviewed: false,
    });
    expect(r.eligible).toBe(true);
    expect(r.thresholdMet).toBe(true);
  });

  it("eligible when deal confirmed and order delivered", () => {
    const r = computeReviewEligibility({
      messageCountSelf: 0,
      messageCountOther: 0,
      dealConfirmed: true,
      orderDelivered: true,
      alreadyReviewed: false,
    });
    expect(r.eligible).toBe(true);
    expect(r.thresholdMet).toBe(true);
  });

  it("not eligible when already reviewed", () => {
    const r = computeReviewEligibility({
      messageCountSelf: 5,
      messageCountOther: 5,
      dealConfirmed: true,
      orderDelivered: true,
      alreadyReviewed: true,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toContain("Už ste hodnotili");
  });

  it("not eligible when order not delivered", () => {
    const r = computeReviewEligibility({
      messageCountSelf: 5,
      messageCountOther: 5,
      dealConfirmed: true,
      orderDelivered: false,
      alreadyReviewed: false,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toContain("doručená");
  });

  it("not eligible when message threshold not met and deal not confirmed", () => {
    const r = computeReviewEligibility({
      messageCountSelf: 1,
      messageCountOther: 2,
      dealConfirmed: false,
      orderDelivered: true,
      alreadyReviewed: false,
    });
    expect(r.eligible).toBe(false);
    expect(r.thresholdMet).toBe(false);
    expect(r.reason).toContain(ELIGIBILITY_MESSAGE_THRESHOLD.toString());
  });
});
