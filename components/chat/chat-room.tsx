"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const optimisticTempIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>(initialMessages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!isModeratorViewOnly) {
      markThreadRead(thread.id);
    }
  }, [thread.id, isModeratorViewOnly]);

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
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const tempId = optimisticTempIdRef.current;
            if (tempId && newMsg.sender_id === currentUserId) {
              optimisticTempIdRef.current = null;
              return prev.filter((m) => m.id !== tempId).concat([newMsg]);
            }
            return [...prev, newMsg];
          });
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
  }, [thread.id]);

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (isModeratorViewOnly) return;

    let disposed = false;
    let pending = false;

    const pollNewMessages = async () => {
      if (pending || disposed) return;
      const latestRealMessage = [...messagesRef.current]
        .reverse()
        .find((m) => !m.id.startsWith("temp-"));
      const url = latestRealMessage?.created_at
        ? `/api/chat/messages?threadId=${thread.id}&after=${encodeURIComponent(latestRealMessage.created_at)}`
        : `/api/chat/messages?threadId=${thread.id}`;
      pending = true;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          setSyncWarning("Správy sa nepodarilo synchronizovať. Skúste obnoviť stránku.");
          return;
        }
        const data = (await res.json()) as { messages?: ChatMessage[] };
        const incoming = Array.isArray(data.messages) ? data.messages : [];
        if (disposed) return;
        if (incoming.length > 0) {
          setSyncWarning(null);
        }
        if (!incoming.length) return;

        setMessages((prev) => {
          let base = prev;
          const tempId = optimisticTempIdRef.current;
          if (
            tempId &&
            incoming.some(
              (m) => m.sender_id === currentUserId && !m.id.startsWith("temp-")
            )
          ) {
            optimisticTempIdRef.current = null;
            base = prev.filter((m) => m.id !== tempId);
          }

          const knownIds = new Set(base.map((m) => m.id));
          const next = incoming.filter((m) => !knownIds.has(m.id));
          return next.length > 0 ? [...base, ...next] : base;
        });
      } catch {
        setSyncWarning("Pripojenie je nestabilné. Skúšam obnoviť synchronizáciu.");
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
  }, [thread.id, isModeratorViewOnly, currentUserId]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlderError(null);
    setLoadingOlder(true);
    const oldest = messages[0];
    try {
      const res = await fetch(
        `/api/chat/messages?threadId=${thread.id}&before=${encodeURIComponent(oldest.created_at)}`
      );
      if (!res.ok) {
        setLoadingOlderError("Staršie správy sa nepodarilo načítať.");
        return;
      }
      const data = await res.json();
      if (data.messages?.length) {
        setMessages((prev) => [...data.messages, ...prev]);
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
      optimisticTempIdRef.current = tempId;
      setMessages((prev) => [...prev, optimistic]);
      return tempId;
    },
    []
  );

  const removeOptimisticMessage = useCallback((tempId: string) => {
    optimisticTempIdRef.current = null;
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
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
    isListingThread && listingSellerId && listingSellerId !== currentUserId
  );
  const hasOrderStatusMessage = messages.some(
    (m) =>
      m.message_type === "order_status" &&
      (
        String(m.metadata?.order_status ?? "") === "price_accepted" ||
        String(m.metadata?.order_status ?? "") === "address_provided" ||
        String(m.metadata?.order_status ?? "") === "shipped" ||
        String(m.metadata?.order_status ?? "") === "delivered" ||
        m.body.toLowerCase().includes("cena odsúhlasená") ||
        m.body.toLowerCase().includes("výmena odsúhlasená")
      )
  );
  const isOfferFlowLocked = isListingThread
    ? Boolean(
        (
          orderState &&
          orderState.status !== "negotiating" &&
          orderState.status !== "cancelled"
        ) ||
          hasOrderStatusMessage
      )
    : Boolean(dealState?.dealConfirmedAt);

  return (
    <div className="flex h-dvh flex-col">
      <ChatHeader thread={thread} />

      {isModeratorViewOnly && (
        <div
          className="border-b bg-muted/50 px-3 py-2 text-center text-sm text-muted-foreground"
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
        className="flex-1 overflow-y-auto px-3 py-4"
        role="log"
        aria-live="polite"
      >
        {syncWarning && (
          <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
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
            <div className="max-w-xs rounded-xl border bg-card px-4 py-3 text-center">
              <p className="text-sm font-medium">Konverzácia je zatiaľ prázdna</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Napíšte prvú správu nižšie.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.sender_id === currentUserId}
                threadId={thread.id}
                canManageOffers={isSellerInListingThread}
                dealConfirmed={isOfferFlowLocked}
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
          dealConfirmed={isOfferFlowLocked}
          addOptimisticMessage={addOptimisticMessage}
          removeOptimisticMessage={removeOptimisticMessage}
        />
      )}
    </div>
  );
}
