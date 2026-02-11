import { describe, expect, it } from "vitest";

import {
  getListingStatusForOrderTransition,
  isPublicListingStatus,
} from "@/lib/listing-lifecycle";

describe("listing lifecycle", () => {
  it("public feed visibility includes only active listings", () => {
    expect(isPublicListingStatus("active")).toBe(true);
    expect(isPublicListingStatus("reserved")).toBe(false);
    expect(isPublicListingStatus("sold")).toBe(false);
  });

  it("maps accepted price offer to reserved listing", () => {
    const result = getListingStatusForOrderTransition({
      nextOrderStatus: "price_accepted",
      previousOrderStatus: "negotiating",
    });

    expect(result).toBe("reserved");
  });

  it("maps delivered order to sold listing", () => {
    const result = getListingStatusForOrderTransition({
      nextOrderStatus: "delivered",
      previousOrderStatus: "shipped",
    });

    expect(result).toBe("sold");
  });

  it("returns active on cancelled before shipped, reserved when cancelled after shipped", () => {
    const cancelledBeforeShip = getListingStatusForOrderTransition({
      nextOrderStatus: "cancelled",
      previousOrderStatus: "address_provided",
    });
    const cancelledAfterShip = getListingStatusForOrderTransition({
      nextOrderStatus: "cancelled",
      previousOrderStatus: "shipped",
    });

    expect(cancelledBeforeShip).toBe("active");
    expect(cancelledAfterShip).toBe("reserved");
  });
});
