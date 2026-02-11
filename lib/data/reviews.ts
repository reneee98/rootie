import { createSupabaseServerClient } from "@/lib/supabaseClient";

export type ReviewEligibility = {
  eligible: boolean;
  reason?: string;
  messageCountSelf: number;
  messageCountOther: number;
  dealConfirmed: boolean;
  orderDelivered: boolean;
  alreadyReviewed: boolean;
};

/**
 * Check if current user can leave a review for seller on listing via thread.
 * Strong gate: listing order status must be \"delivered\" and user must be buyer.
 */
export async function getReviewEligibility(
  threadId: string,
  listingId: string,
  reviewerId: string,
  sellerId: string
): Promise<ReviewEligibility> {
  const supabase = await createSupabaseServerClient();

  const [threadRes, orderRes, existingRes] = await Promise.all([
    supabase
      .from("threads")
      .select("id, user1_id, user2_id, context_type, listing_id")
      .eq("id", threadId)
      .eq("listing_id", listingId)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("status, buyer_id, seller_id")
      .eq("thread_id", threadId)
      .eq("listing_id", listingId)
      .maybeSingle(),
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
      orderDelivered: false,
      alreadyReviewed: false,
    };
  }

  if (thread.context_type !== "listing" || !thread.listing_id) {
    return {
      eligible: false,
      reason: "Recenziu je možné vytvoriť len pre konverzáciu k inzerátu.",
      messageCountSelf: 0,
      messageCountOther: 0,
      dealConfirmed: false,
      orderDelivered: false,
      alreadyReviewed: false,
    };
  }

  const isParticipant =
    thread.user1_id === reviewerId || thread.user2_id === reviewerId;
  const otherId =
    thread.user1_id === reviewerId ? thread.user2_id : thread.user1_id;
  if (!isParticipant) {
    return {
      eligible: false,
      reason: "Nie ste účastník tejto konverzácie.",
      messageCountSelf: 0,
      messageCountOther: 0,
      dealConfirmed: false,
      orderDelivered: false,
      alreadyReviewed: false,
    };
  }

  if (otherId !== sellerId) {
    return {
      eligible: false,
      reason: "Predajca v tejto konverzácii nesedí.",
      messageCountSelf: 0,
      messageCountOther: 0,
      dealConfirmed: false,
      orderDelivered: false,
      alreadyReviewed: false,
    };
  }

  if (reviewerId === sellerId) {
    return {
      eligible: false,
      reason: "Recenziu môže pridať iba kupujúci.",
      messageCountSelf: 0,
      messageCountOther: 0,
      dealConfirmed: false,
      orderDelivered: false,
      alreadyReviewed: false,
    };
  }

  if (orderRes.error && orderRes.error.code !== "42P01") {
    console.error("getReviewEligibility order error:", orderRes.error);
  }

  const order = orderRes.error ? null : orderRes.data;
  const orderDelivered = order?.status === "delivered";
  const alreadyReviewed = existingRes.data != null;
  const isOrderBuyer = order?.buyer_id === reviewerId;
  const isOrderSeller = order?.seller_id === sellerId;
  const eligible = Boolean(orderDelivered && isOrderBuyer && isOrderSeller && !alreadyReviewed);

  let reason: string | undefined;
  if (alreadyReviewed) reason = "Už ste hodnotili tento inzerát.";
  else if (!order)
    reason = "Recenziu môžete pridať až po vytvorení objednávky v tejto konverzácii.";
  else if (!isOrderBuyer || !isOrderSeller)
    reason = "Recenziu môže pridať len kupujúci tejto objednávky.";
  else if (!orderDelivered)
    reason = "Recenziu môžete pridať až po potvrdení stavu „Doručené“.";

  return {
    eligible,
    reason,
    messageCountSelf: 0,
    messageCountOther: 0,
    dealConfirmed: false,
    orderDelivered,
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

  const isMissingColumnError = (
    e: { code?: string; message?: string } | null,
    columnName: string
  ) =>
    (e?.code === "42703" || e?.code === "PGRST204") &&
    (e.message ?? "").includes(columnName);

  let hasOrderDeliveredAtColumn = true;
  let threadRes = await supabase
    .from("threads")
    .select("deal_confirmed_at, order_delivered_at, user1_id, user2_id")
    .eq("id", threadId)
    .single();

  if (isMissingColumnError(threadRes.error, "order_delivered_at")) {
    hasOrderDeliveredAtColumn = false;
    threadRes = await supabase
      .from("threads")
      .select("deal_confirmed_at, user1_id, user2_id")
      .eq("id", threadId)
      .single();
  }

  const confirmationsRes = await supabase
    .from("thread_deal_confirmations")
    .select("user_id")
    .eq("thread_id", threadId);

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
    orderDeliveredAt: hasOrderDeliveredAtColumn
      ? ((thread as { order_delivered_at?: string | null }).order_delivered_at ??
        null)
      : null,
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
 * (listing thread exists, order delivered, no review yet).
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
