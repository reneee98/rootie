"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { markThreadRead } from "@/lib/actions/chat";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatDealAndReview } from "@/components/chat/chat-deal-and-review";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatComposer } from "@/components/chat/chat-composer";
import type { ThreadDetail } from "@/lib/data/chat";
import type { ChatMessage } from "@/lib/data/chat";
import type { ThreadDealState, ReviewEligibility } from "@/lib/data/reviews";
import type { ThreadOrder, ProfileShippingAddress } from "@/lib/data/orders";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { mergeChatMessages, confirmOptimisticChatMessage } from "@/lib/chat-message-state";

type ChatRoomProps = {
  thread: ThreadDetail;
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
  currentUserId: string;
  dealState?: ThreadDealState | null;
  orderState?: ThreadOrder | null;
  buyerDefaultShippingAddress?: ProfileShippingAddress | null;
  reviewEligibility?: ReviewEligibility | null;
  listingSellerId?: string | null;
  listingType?: "fixed" | "auction";
  listingSwapEnabled?: boolean;
  canSendText?: boolean;
  sendTextBlockedReason?: string | null;
  hasBuyerReviewed?: boolean | null;
  /** True when current user is moderator viewing thread but not a participant (read-only). */
  isModeratorViewOnly?: boolean;
};

export function ChatRoom({
  thread,
  initialMessages,
  initialHasMore,
  currentUserId,
  dealState,
  orderState,
  buyerDefaultShippingAddress,
  reviewEligibility,
  listingSellerId,
  listingType,
  listingSwapEnabled = false,
  canSendText = true,
  sendTextBlockedReason,
  hasBuyerReviewed,
  isModeratorViewOnly = false,
}: ChatRoomProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadingOlderError, setLoadingOlderError] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>(initialMessages);
  const olderScrollHeightRef = useRef<number | null>(null);
  const scrollHeightRef = useRef(0);
  const latestInitialMessage = initialMessages.at(-1);
  const pollCursorRef = useRef<{ createdAt: string; id?: string }>({
    createdAt: latestInitialMessage?.created_at ?? "1970-01-01T00:00:00.000Z",
    id: latestInitialMessage?.id,
  });

  useEffect(() => {
    // Server action revalidation updates props without remounting the room.
    setMessages((current) => mergeChatMessages(current, initialMessages));
  }, [initialMessages]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const lastRealMessageId = messages.filter((message) => !message.id.startsWith("temp-")).at(-1)?.id;
  useEffect(() => {
    if (isModeratorViewOnly) return;
    const readVisibleThread = () => {
      if (document.visibilityState === "visible") void markThreadRead(thread.id).catch(() => {});
    };
    readVisibleThread();
    document.addEventListener("visibilitychange", readVisibleThread);
    return () => document.removeEventListener("visibilitychange", readVisibleThread);
  }, [thread.id, isModeratorViewOnly, lastRealMessageId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`messages-${thread.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${thread.id}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const newMsg: ChatMessage = {
            id: row.id as string,
            thread_id: row.thread_id as string,
            sender_id: row.sender_id as string,
            body: (row.body as string) || "",
            message_type: (row.message_type as ChatMessage["message_type"]) ?? "text",
            metadata: (row.metadata as Record<string, unknown>) ?? {},
            attachments: Array.isArray(row.attachments)
              ? (row.attachments as { url: string; type?: string }[])
              : [],
            created_at: row.created_at as string,
          };
          setMessages((prev) => mergeChatMessages(prev, [newMsg]));
          if (newMsg.message_type === "order_status" || newMsg.message_type === "system") router.refresh();
        }
      )
      .subscribe();

    return () => {
      // Defer removal so the WebSocket isn't closed before it's established
      // (avoids "WebSocket is closed before the connection is established" when
      // React runs effect cleanup during Strict Mode or fast re-mount).
      const channelToRemove = channel;
      setTimeout(() => {
        supabase.removeChannel(channelToRemove);
      }, 0);
    };
  }, [thread.id, router]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (olderScrollHeightRef.current !== null) {
      list.scrollTop += list.scrollHeight - olderScrollHeightRef.current;
      olderScrollHeightRef.current = null;
    } else if (scrollHeightRef.current === 0 || scrollHeightRef.current - list.scrollTop - list.clientHeight < 120) {
      list.scrollTop = list.scrollHeight;
    }
    scrollHeightRef.current = list.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (isModeratorViewOnly) return;

    let disposed = false;
    let pending = false;

    const pollNewMessages = async () => {
      if (pending || disposed) return;
      const params = new URLSearchParams({ threadId: thread.id, after: pollCursorRef.current.createdAt });
      if (pollCursorRef.current.id) params.set("afterId", pollCursorRef.current.id);
      const url = `/api/chat/messages?${params}`;
      pending = true;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          if (!disposed) setSyncWarning("Správy sa nepodarilo synchronizovať. Skúste obnoviť stránku.");
          return;
        }
        const data = (await res.json()) as { messages?: ChatMessage[] };
        const incoming = Array.isArray(data.messages) ? data.messages : [];
        if (disposed) return;
        setSyncWarning(null);
        if (!incoming.length) return;
        const newestIncoming = incoming.at(-1);
        if (newestIncoming) pollCursorRef.current = { createdAt: newestIncoming.created_at, id: newestIncoming.id };
        const knownIds = new Set(messagesRef.current.map((message) => message.id));
        if (incoming.some((message) => !knownIds.has(message.id) && ["order_status", "system"].includes(message.message_type))) router.refresh();
        setMessages((prev) => mergeChatMessages(prev, incoming));
      } catch {
        if (!disposed) setSyncWarning("Pripojenie je nestabilné. Skúšam obnoviť synchronizáciu.");
      } finally {
        pending = false;
      }
    };

    const interval = setInterval(() => {
      void pollNewMessages();
    }, 3000);

    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, [thread.id, isModeratorViewOnly, router]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlderError(null);
    setLoadingOlder(true);
    const oldest = messages[0];
    try {
      const res = await fetch(
        `/api/chat/messages?threadId=${thread.id}&before=${encodeURIComponent(oldest.created_at)}&beforeId=${encodeURIComponent(oldest.id)}`
      );
      if (!res.ok) {
        setLoadingOlderError("Staršie správy sa nepodarilo načítať.");
        return;
      }
      const data = await res.json();
      if (data.messages?.length) {
        olderScrollHeightRef.current = listRef.current?.scrollHeight ?? null;
        setMessages((prev) => mergeChatMessages(prev, data.messages));
      }
      setHasMore(data.hasMore ?? false);
    } catch {
      setLoadingOlderError("Staršie správy sa nepodarilo načítať.");
    } finally {
      setLoadingOlder(false);
    }
  }, [thread.id, messages, hasMore, loadingOlder]);

  const addOptimisticMessage = useCallback(
    (msg: Omit<ChatMessage, "id">): string => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const optimistic: ChatMessage = {
        ...msg,
        id: tempId,
      };
      setMessages((prev) => [...prev, optimistic]);
      return tempId;
    },
    []
  );

  const removeOptimisticMessage = useCallback((tempId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  }, []);

  const confirmOptimisticMessage = useCallback((tempId: string, messageId: string, createdAt: string) => {
    setMessages((prev) => confirmOptimisticChatMessage(prev, tempId, messageId, createdAt));
  }, []);

  const uploadImageUrl = useCallback(
    async (file: File): Promise<string> => {
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      const {
        data: { publicUrl },
      } = supabase.storage.from("chat-attachments").getPublicUrl(path);
      return publicUrl;
    },
    [currentUserId]
  );

  const isListingThread = thread.context_type === "listing";
  const isSellerInListingThread = Boolean(
    isListingThread && listingSellerId && listingSellerId === currentUserId
  );
  const canBuyerSendOffers = Boolean(
    isListingThread &&
      listingType === "fixed" &&
      listingSellerId &&
      listingSellerId !== currentUserId
  );
  const latestOrderMessage = messages.filter((m) => m.message_type === "order_status").at(-1);
  const latestOrderStatus = String(latestOrderMessage?.metadata?.order_status ?? "");
  const isOfferFlowLocked = isListingThread
    ? latestOrderStatus
      ? ["price_accepted", "address_provided", "shipped", "delivered"].includes(latestOrderStatus)
      : Boolean(orderState && orderState.status !== "negotiating" && orderState.status !== "cancelled")
    : Boolean(dealState?.dealConfirmedAt);

  return (
    <div className="flex h-dvh flex-col bg-[#f8f4eb]">
      <ChatHeader thread={thread} readOnly={isModeratorViewOnly} />

      {isModeratorViewOnly && (
        <div
          className="border-b border-[#e9e2d1] bg-[#f4efe3] px-3 py-2 text-center text-sm text-[#67635c]"
          role="status"
          aria-live="polite"
        >
          Prehliadka ako moderátor – len na čítanie. Na akcie (vyriešiť, upozorniť, zablokovať) choď do{" "}
          <Link
            href="/admin/reports"
            className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
          >
            Nahlásenia
          </Link>
          .
        </div>
      )}

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-3 py-3"
        role="log"
        aria-live="polite"
      >
        {syncWarning && (
          <div className="mb-3 rounded-[14px] border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {syncWarning}
          </div>
        )}

        {hasMore && (
          <div className="py-2">
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadOlder}
                disabled={loadingOlder}
                className="rounded-full border border-[#e9e2d1] bg-[#faf8f4] px-4 text-[#232711] hover:bg-[#f1ece1]"
              >
                {loadingOlder ? "Načítavam…" : "Staršie správy"}
              </Button>
            </div>
            {loadingOlderError && (
              <p className="mt-1 text-center text-xs text-destructive">
                {loadingOlderError}
              </p>
            )}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex min-h-[35vh] items-center justify-center">
            <div className="max-w-xs rounded-[16px] border border-[#e9e2d1] bg-[#faf8f4] px-4 py-3 text-center shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
              <p className="text-sm font-medium text-[#232711]">Konverzácia je zatiaľ prázdna</p>
              <p className="mt-1 text-xs text-[#67635c]">
                {canSendText
                  ? "Napíšte prvú správu nižšie."
                  : (sendTextBlockedReason ?? "Písanie v chate je zatiaľ vypnuté.")}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.sender_id === currentUserId}
                threadId={thread.id}
                canManageOffers={isSellerInListingThread}
                canAcceptPriceCounter={canBuyerSendOffers && msg.sender_id === listingSellerId}
                dealConfirmed={isOfferFlowLocked || messages.some((reply) => reply.message_type === "system" && reply.metadata?.source_offer_message_id === msg.id && reply.metadata?.action === "declined")}
                isListingThread={isListingThread}
                onOrderStateChanged={() => router.refresh()}
                onSent={() => scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" })}
              />
            ))}
          </div>
        )}

        <div ref={scrollBottomRef} />
      </div>

      {!isModeratorViewOnly && (
        <ChatDealAndReview
          thread={thread}
          currentUserId={currentUserId}
          dealState={dealState}
          orderState={orderState}
          buyerDefaultShippingAddress={buyerDefaultShippingAddress}
          reviewEligibility={reviewEligibility}
          listingSellerId={listingSellerId}
          hasBuyerReviewed={hasBuyerReviewed}
        />
      )}

      {!isModeratorViewOnly && (
        <ChatComposer
          threadId={thread.id}
          currentUserId={currentUserId}
          onSent={() => scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" })}
          uploadImageUrl={uploadImageUrl}
          canBuyerSendOffers={canBuyerSendOffers}
          canBuyerSendSwapOffers={canBuyerSendOffers && listingSwapEnabled}
          dealConfirmed={isOfferFlowLocked}
          textMessagingEnabled={canSendText || (listingType === "fixed" && messages.some((message) => message.sender_id !== listingSellerId && ["offer_price", "offer_swap"].includes(message.message_type)))}
          textMessagingDisabledReason={sendTextBlockedReason ?? undefined}
          addOptimisticMessage={addOptimisticMessage}
          removeOptimisticMessage={removeOptimisticMessage}
          confirmOptimisticMessage={confirmOptimisticMessage}
        />
      )}
    </div>
  );
}
