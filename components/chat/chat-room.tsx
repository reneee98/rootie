"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { markThreadRead } from "@/lib/actions/chat";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatDealAndReview } from "@/components/chat/chat-deal-and-review";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatComposer } from "@/components/chat/chat-composer";
import type { ThreadDetail } from "@/lib/data/chat";
import type { ChatMessage } from "@/lib/data/chat";
import type { ThreadDealState, ReviewEligibility } from "@/lib/data/reviews";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type ChatRoomProps = {
  thread: ThreadDetail;
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
  currentUserId: string;
  dealState?: ThreadDealState | null;
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
  reviewEligibility,
  listingSellerId,
  hasBuyerReviewed,
  isModeratorViewOnly = false,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [thread.id]);

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    const oldest = messages[0];
    const res = await fetch(
      `/api/chat/messages?threadId=${thread.id}&before=${encodeURIComponent(oldest.created_at)}`
    );
    const data = await res.json();
    setLoadingOlder(false);
    if (data.messages?.length) {
      setMessages((prev) => [...data.messages, ...prev]);
    }
    setHasMore(data.hasMore ?? false);
  }, [thread.id, messages, hasMore, loadingOlder]);

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
        {hasMore && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadOlder}
              disabled={loadingOlder}
            >
              {loadingOlder ? "Načítavam…" : "Staršie správy"}
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === currentUserId}
            />
          ))}
        </div>

        <div ref={scrollBottomRef} />
      </div>

      {!isModeratorViewOnly && (
        <ChatDealAndReview
          thread={thread}
          currentUserId={currentUserId}
          dealState={dealState}
          reviewEligibility={reviewEligibility}
          listingSellerId={listingSellerId}
          hasBuyerReviewed={hasBuyerReviewed}
        />
      )}

      {!isModeratorViewOnly && (
        <ChatComposer
          threadId={thread.id}
          onSent={() => scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" })}
          uploadImageUrl={uploadImageUrl}
          isSellerInListingThread={Boolean(
            listingSellerId && listingSellerId === currentUserId
          )}
          dealConfirmed={Boolean(dealState?.dealConfirmedAt)}
        />
      )}
    </div>
  );
}
