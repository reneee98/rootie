import { createSupabaseServerClient } from "@/lib/supabaseClient";

const ELIGIBILITY_MESSAGE_THRESHOLD = 2;

export type ReviewEligibility = {
  eligible: boolean;
  reason?: string;
  messageCountSelf: number;
  messageCountOther: number;
  dealConfirmed: boolean;
  alreadyReviewed: boolean;
};

/**
 * Check if the current user can leave a review for the seller on the given listing
 * via the given thread. Eligibility: thread exists between reviewer and seller for this listing,
 * and (both sides have sent >= N messages OR deal confirmed), and no existing review.
 */
export async function getReviewEligibility(
  threadId: string,
  listingId: string,
  reviewerId: string,
  sellerId: string
): Promise<ReviewEligibility> {
  const supabase = await createSupabaseServerClient();

  const [threadRes, msgCountRes, confirmationsRes, dealRes, existingRes] =
    await Promise.all([
      supabase
        .from("threads")
        .select("id, user1_id, user2_id, deal_confirmed_at, order_delivered_at")
        .eq("id", threadId)
        .eq("listing_id", listingId)
        .maybeSingle(),
      supabase
        .from("messages")
        .select("sender_id")
        .eq("thread_id", threadId),
      supabase
        .from("thread_deal_confirmations")
        .select("user_id")
        .eq("thread_id", threadId),
      supabase
        .from("threads")
        .select("deal_confirmed_at")
        .eq("id", threadId)
        .single(),
      supabase
        .from("reviews")
        .select("id")
        .eq("reviewer_id", reviewerId)
        .eq("listing_id", listingId)
        .maybeSingle(),
    ]);

  const thread = threadRes.data;
  if (!thread || threadRes.error) {
    return {
      eligible: false,
      reason: "Konverzácia neexistuje.",
      messageCountSelf: 0,
      messageCountOther: 0,
      dealConfirmed: false,
      alreadyReviewed: false,
    };
  }

  const isParticipant =
    thread.user1_id === reviewerId || thread.user2_id === reviewerId;
  const otherId =
    thread.user1_id === reviewerId ? thread.user2_id : thread.user1_id;
  if (otherId !== sellerId) {
    return {
      eligible: false,
      reason: "Predajca v tejto konverzácii nesedí.",
      messageCountSelf: 0,
      messageCountOther: 0,
      dealConfirmed: false,
      alreadyReviewed: false,
    };
  }

  const messages = msgCountRes.data ?? [];
  const messageCountSelf = messages.filter((m) => m.sender_id === reviewerId).length;
  const messageCountOther = messages.filter((m) => m.sender_id === sellerId).length;
  const dealConfirmed = Boolean(dealRes.data?.deal_confirmed_at);
  const orderDelivered = Boolean(threadRes.data?.order_delivered_at);
  const alreadyReviewed = existingRes.data != null;

  const thresholdMet =
    (messageCountSelf >= ELIGIBILITY_MESSAGE_THRESHOLD &&
      messageCountOther >= ELIGIBILITY_MESSAGE_THRESHOLD) ||
    dealConfirmed;

  // Buyer can only leave review after confirming "Objednávka doručená"
  const eligible =
    thresholdMet && !alreadyReviewed && orderDelivered;

  let reason: string | undefined;
  if (alreadyReviewed) reason = "Už ste hodnotili tento inzerát.";
  else if (!orderDelivered)
    reason = "Môžete hodnotiť po potvrdení, že objednávka bola doručená.";
  else if (!thresholdMet)
    reason =
      "Môžete hodnotiť po aspoň " +
      ELIGIBILITY_MESSAGE_THRESHOLD +
      " správach od oboch strán alebo po potvrdení dohody oboma.";

  return {
    eligible,
    reason,
    messageCountSelf,
    messageCountOther,
    dealConfirmed,
    alreadyReviewed,
  };
}

export type ThreadDealState = {
  dealConfirmedAt: string | null;
  iConfirmed: boolean;
  otherConfirmed: boolean;
  orderDeliveredAt: string | null;
};

export async function getThreadDealState(
  threadId: string,
  currentUserId: string
): Promise<ThreadDealState | null> {
  const supabase = await createSupabaseServerClient();

  const [threadRes, confirmationsRes] = await Promise.all([
    supabase
      .from("threads")
      .select("deal_confirmed_at, order_delivered_at, user1_id, user2_id")
      .eq("id", threadId)
      .single(),
    supabase
      .from("thread_deal_confirmations")
      .select("user_id")
      .eq("thread_id", threadId),
  ]);

  if (threadRes.error || !threadRes.data) return null;

  const thread = threadRes.data;
  const otherId =
    thread.user1_id === currentUserId ? thread.user2_id : thread.user1_id;
  const confirmedUserIds = new Set(
    (confirmationsRes.data ?? []).map((r) => r.user_id as string)
  );

  return {
    dealConfirmedAt: thread.deal_confirmed_at ?? null,
    iConfirmed: confirmedUserIds.has(currentUserId),
    otherConfirmed: confirmedUserIds.has(otherId),
    orderDeliveredAt: thread.order_delivered_at ?? null,
  };
}

/**
 * For listing thread: has the buyer (other participant) left a review for this listing?
 * Call when current user is the seller.
 */
export async function getHasBuyerReviewed(
  listingId: string,
  buyerId: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("reviews")
    .select("id")
    .eq("listing_id", listingId)
    .eq("reviewer_id", buyerId)
    .maybeSingle();
  return data != null;
}

export type ReviewableListing = {
  threadId: string;
  listingId: string;
  listingTitle: string;
};

/**
 * Listings for which the current user can leave a review for the given seller
 * (they have a listing thread, eligibility met, no review yet).
 */
export async function getReviewableListings(
  sellerId: string,
  userId: string
): Promise<ReviewableListing[]> {
  const supabase = await createSupabaseServerClient();

  const { data: threads, error } = await supabase
    .from("threads")
    .select("id, listing_id, user1_id, user2_id")
    .eq("context_type", "listing")
    .not("listing_id", "is", null)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (error || !threads?.length) return [];

  const listingIds = threads
    .filter(
      (t) =>
        (t.user1_id === userId && t.user2_id === sellerId) ||
        (t.user2_id === userId && t.user1_id === sellerId)
    )
    .map((t) => ({ threadId: t.id, listingId: t.listing_id as string }));

  if (listingIds.length === 0) return [];

  const { data: listings } = await supabase
    .from("listings")
    .select("id, plant_name")
    .in(
      "id",
      listingIds.map((x) => x.listingId)
    );

  const listingMap = new Map(
    (listings ?? []).map((l) => [l.id, l.plant_name ?? "Inzerát"])
  );

  const results: ReviewableListing[] = [];
  for (const { threadId, listingId } of listingIds) {
    const eligibility = await getReviewEligibility(
      threadId,
      listingId,
      userId,
      sellerId
    );
    if (eligibility.eligible) {
      results.push({
        threadId,
        listingId,
        listingTitle: listingMap.get(listingId) ?? "Inzerát",
      });
    }
  }
  return results;
}
