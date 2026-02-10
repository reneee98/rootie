/**
 * Pure bid validation for auction listings.
 * Used by place-bid action and unit tests.
 */

export type BidValidationInput = {
  startPrice: number;
  minIncrement: number;
  topBidAmount: number | null;
  amount: number;
  auctionEndsAt: Date | null;
  now?: Date;
};

export type BidValidationResult =
  | { valid: true; minBid: number }
  | { valid: false; error: string; minBid: number };

/**
 * Compute minimum next bid: first bid >= startPrice, subsequent >= topBid + minIncrement.
 */
export function computeMinBid(
  startPrice: number,
  minIncrement: number,
  topBidAmount: number | null
): number {
  if (topBidAmount != null) {
    return topBidAmount + minIncrement;
  }
  return startPrice;
}

/**
 * Validate bid amount and auction end time. Pure, no I/O.
 */
export function validateBid(input: BidValidationInput): BidValidationResult {
  const { startPrice, minIncrement, topBidAmount, amount, auctionEndsAt, now = new Date() } = input;
  const minBid = computeMinBid(startPrice, minIncrement, topBidAmount);

  if (auctionEndsAt && auctionEndsAt <= now) {
    return { valid: false, error: "Aukcia už skončila.", minBid };
  }
  if (amount < minBid) {
    return { valid: false, error: `Minimálna ponuka je ${minBid.toFixed(2)} €.`, minBid };
  }
  return { valid: true, minBid };
}
