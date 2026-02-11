import type { OrderStatus } from "@/lib/data/orders";

export type ListingLifecycleStatus =
  | "active"
  | "reserved"
  | "sold"
  | "expired"
  | "removed";

export const PUBLIC_LISTING_STATUS: ListingLifecycleStatus = "active";

export function isPublicListingStatus(status: string | null | undefined): boolean {
  return status === PUBLIC_LISTING_STATUS;
}

export function getListingStatusForOrderTransition(input: {
  nextOrderStatus: OrderStatus;
  previousOrderStatus?: OrderStatus | null;
}): ListingLifecycleStatus {
  const { nextOrderStatus, previousOrderStatus = null } = input;

  if (nextOrderStatus === "delivered") {
    return "sold";
  }

  if (
    nextOrderStatus === "price_accepted" ||
    nextOrderStatus === "address_provided" ||
    nextOrderStatus === "shipped"
  ) {
    return "reserved";
  }

  if (nextOrderStatus === "cancelled") {
    // When cancellation happens after shipment, keep listing off the public feed.
    return previousOrderStatus === "shipped" ? "reserved" : "active";
  }

  return "active";
}
