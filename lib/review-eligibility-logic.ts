/**
 * Pure review eligibility logic (no I/O).
 * Used by getReviewEligibility and unit tests.
 */

export type ReviewEligibilityInput = {
  orderDelivered: boolean;
  alreadyReviewed: boolean;
  isBuyer: boolean;
};

export type ReviewEligibilityResult = {
  eligible: boolean;
  reason?: string;
};

/**
 * Determine if user can leave a review in listing flow.
 * Strong gate: only buyer and only when order is delivered.
 */
export function computeReviewEligibility(
  input: ReviewEligibilityInput
): ReviewEligibilityResult {
  const { orderDelivered, alreadyReviewed, isBuyer } = input;
  const eligible = isBuyer && orderDelivered && !alreadyReviewed;

  let reason: string | undefined;
  if (alreadyReviewed) {
    reason = "Už ste hodnotili tento inzerát.";
  } else if (!isBuyer) {
    reason = "Recenziu môže pridať iba kupujúci.";
  } else if (!orderDelivered) {
    reason = "Recenziu môžete pridať až po potvrdení stavu „Doručené“.";
  }

  return { eligible, reason };
}
