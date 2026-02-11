import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getThreadDetail, getMessages } from "@/lib/data/chat";
import { getThreadOrder, getProfileShippingAddress } from "@/lib/data/orders";
import {
  getThreadDealState,
  getReviewEligibility,
  getHasBuyerReviewed,
} from "@/lib/data/reviews";
import { ChatRoom } from "@/components/chat/chat-room";

type ChatThreadPageProps = {
  params: Promise<{ threadId: string }>;
};

export default async function ChatThreadPage({ params }: ChatThreadPageProps) {
  const { threadId } = await params;
  const user = await requireUser(`/chat/${threadId}`);

  const [thread, { messages, hasMore }, dealState, orderState] = await Promise.all([
    getThreadDetail(threadId, user.id),
    getMessages(threadId, user.id),
    getThreadDealState(threadId, user.id),
    getThreadOrder(threadId),
  ]);

  if (!thread) {
    notFound();
  }

  const isParticipant =
    thread.user1_id === user.id || thread.user2_id === user.id;
  const isModeratorViewOnly = !isParticipant;

  let reviewEligibility: Awaited<ReturnType<typeof getReviewEligibility>> | null =
    null;
  let listingSellerId: string | null = null;
  let listingType: "fixed" | "auction" | null = null;
  let hasBuyerReviewed: boolean | null = null;
  let buyerDefaultShippingAddress: Awaited<ReturnType<typeof getProfileShippingAddress>> | null =
    null;
  let canSendText = true;
  let sendTextBlockedReason: string | null = null;
  if (thread.context_type === "listing" && thread.listing_id) {
    const { createSupabaseServerClient } = await import("@/lib/supabaseClient");
    const supabase = await createSupabaseServerClient();
    const { data: listing } = await supabase
      .from("listings")
      .select("seller_id, type, status")
      .eq("id", thread.listing_id)
      .single();
    listingSellerId = listing?.seller_id ?? null;
    listingType =
      listing?.type === "fixed" || listing?.type === "auction"
        ? (listing.type as "fixed" | "auction")
        : null;
    const buyerId =
      listingSellerId && thread.user1_id === listingSellerId
        ? thread.user2_id
        : listingSellerId
          ? thread.user1_id
          : null;

    if (listingType === "fixed" && buyerId) {
      const { data: offerRows } = await supabase
        .from("messages")
        .select("id")
        .eq("thread_id", threadId)
        .eq("sender_id", buyerId)
        .in("message_type", ["offer_price", "offer_swap"])
        .limit(1);

      if (!offerRows?.length) {
        canSendText = false;
        sendTextBlockedReason =
          "Do chatu môžete písať až po odoslaní ponuky (cena alebo výmena).";
      }
    }

    if (listingType === "auction") {
      const { data: winningRows } = await supabase
        .from("bids")
        .select("bidder_id")
        .eq("listing_id", thread.listing_id)
        .order("amount", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1);
      const winnerId = winningRows?.[0]?.bidder_id ?? null;
      const winnerMatchesParticipants =
        Boolean(buyerId) && Boolean(winnerId) && buyerId === winnerId;
      const sold = listing?.status === "sold";
      canSendText = sold && winnerMatchesParticipants;
      if (!canSendText) {
        sendTextBlockedReason =
          "V aukcii môžete písať do chatu až po výhre aukcie.";
      }
    }

    if (listingSellerId && listingSellerId !== user.id) {
      reviewEligibility = await getReviewEligibility(
        threadId,
        thread.listing_id,
        user.id,
        listingSellerId
      );
      buyerDefaultShippingAddress = await getProfileShippingAddress(user.id);
    }
    if (listingSellerId && listingSellerId === user.id) {
      const buyerId =
        thread.user1_id === user.id ? thread.user2_id : thread.user1_id;
      hasBuyerReviewed = await getHasBuyerReviewed(thread.listing_id, buyerId);
    }
  }

  return (
    <ChatRoom
      thread={thread}
      initialMessages={messages}
      initialHasMore={hasMore}
      currentUserId={user.id}
      dealState={dealState ?? undefined}
      orderState={orderState ?? undefined}
      buyerDefaultShippingAddress={buyerDefaultShippingAddress ?? undefined}
      reviewEligibility={reviewEligibility ?? undefined}
      listingSellerId={listingSellerId ?? undefined}
      listingType={listingType ?? undefined}
      canSendText={canSendText}
      sendTextBlockedReason={sendTextBlockedReason ?? undefined}
      hasBuyerReviewed={hasBuyerReviewed ?? undefined}
      isModeratorViewOnly={isModeratorViewOnly}
    />
  );
}
