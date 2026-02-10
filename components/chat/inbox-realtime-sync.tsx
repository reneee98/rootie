"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

type InboxRealtimeSyncProps = {
  threadIds: string[];
};

/**
 * Subscribes to new messages; when a message arrives in any of the user's threads,
 * refreshes the inbox so the list and last message preview update in realtime.
 */
export function InboxRealtimeSync({ threadIds }: InboxRealtimeSyncProps) {
  const router = useRouter();

  useEffect(() => {
    if (threadIds.length === 0) return;

    const idsSet = new Set(threadIds);
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("inbox-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const threadId = row?.thread_id as string | undefined;
          if (threadId && idsSet.has(threadId)) {
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, threadIds.slice().sort().join(",")]);

  return null;
}
