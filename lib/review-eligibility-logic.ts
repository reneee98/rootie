/**
 * Pure review eligibility logic (no I/O).
 * Used by getReviewEligibility and unit tests.
 */

export const ELIGIBILITY_MESSAGE_THRESHOLD = 2;

export type ReviewEligibilityInput = {
  messageCountSelf: number;
  messageCountOther: number;
  dealConfirmed: boolean;
  orderDelivered: boolean;
  alreadyReviewed: boolean;
};

export type ReviewEligibilityResult = {
  eligible: boolean;
  reason?: string;
  thresholdMet: boolean;
};

/**
 * Determine if user is eligible to leave a review from message counts and flags.
 */
export function computeReviewEligibility(
  input: ReviewEligibilityInput
): ReviewEligibilityResult {
  const {
    messageCountSelf,
    messageCountOther,
    dealConfirmed,
    orderDelivered,
    alreadyReviewed,
  } = input;

  const thresholdMet =
    (messageCountSelf >= ELIGIBILITY_MESSAGE_THRESHOLD &&
      messageCountOther >= ELIGIBILITY_MESSAGE_THRESHOLD) ||
    dealConfirmed;

  const eligible = thresholdMet && !alreadyReviewed && orderDelivered;

  let reason: string | undefined;
  if (alreadyReviewed) {
    reason = "Už ste hodnotili tento inzerát.";
  } else if (!orderDelivered) {
    reason = "Môžete hodnotiť po potvrdení, že objednávka bola doručená.";
  } else if (!thresholdMet) {
    reason =
      "Môžete hodnotiť po aspoň " +
      ELIGIBILITY_MESSAGE_THRESHOLD +
      " správach od oboch strán alebo po potvrdení dohody oboma.";
  }

  return { eligible, reason, thresholdMet };
}
