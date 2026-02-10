import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getThreadDetail, getMessages } from "@/lib/data/chat";
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

  const [thread, { messages, hasMore }, dealState] = await Promise.all([
    getThreadDetail(threadId, user.id),
    getMessages(threadId, user.id),
    getThreadDealState(threadId, user.id),
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
  let hasBuyerReviewed: boolean | null = null;
  if (thread.context_type === "listing" && thread.listing_id) {
    const { createSupabaseServerClient } = await import("@/lib/supabaseClient");
    const supabase = await createSupabaseServerClient();
    const { data: listing } = await supabase
      .from("listings")
      .select("seller_id")
      .eq("id", thread.listing_id)
      .single();
    listingSellerId = listing?.seller_id ?? null;
    if (listingSellerId && listingSellerId !== user.id) {
      reviewEligibility = await getReviewEligibility(
        threadId,
        thread.listing_id,
        user.id,
        listingSellerId
      );
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
      reviewEligibility={reviewEligibility ?? undefined}
      listingSellerId={listingSellerId ?? undefined}
      hasBuyerReviewed={hasBuyerReviewed ?? undefined}
      isModeratorViewOnly={isModeratorViewOnly}
    />
  );
}
