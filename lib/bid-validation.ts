/**
 * Pure bid validation for auction listings.
 * Used by place-bid action and unit tests.
 */
import { isValidEuroAmount } from "@/lib/money-validation";

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
    return Math.round((topBidAmount + minIncrement) * 100) / 100;
  }
  return startPrice;
}

/**
 * Validate bid amount and auction end time. Pure, no I/O.
 */
export function validateBid(input: BidValidationInput): BidValidationResult {
  const { startPrice, minIncrement, topBidAmount, amount, auctionEndsAt, now = new Date() } = input;
  const minBid = computeMinBid(startPrice, minIncrement, topBidAmount);

  if (!isValidEuroAmount(amount)) {
    return { valid: false, error: "Zadajte platnú sumu s najviac dvoma desatinnými miestami.", minBid };
  }
  if (!isValidEuroAmount(startPrice) || !isValidEuroAmount(minIncrement) ||
      (topBidAmount != null && !isValidEuroAmount(topBidAmount)) ||
      (auctionEndsAt != null && !Number.isFinite(auctionEndsAt.getTime()))) {
    return { valid: false, error: "Aukcia nemá platné nastavenia.", minBid };
  }

  if (auctionEndsAt && auctionEndsAt <= now) {
    return { valid: false, error: "Aukcia už skončila.", minBid };
  }
  if (amount < minBid) {
    return { valid: false, error: `Minimálna ponuka je ${minBid.toFixed(2)} €.`, minBid };
  }
  return { valid: true, minBid };
}
