"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

/**
 * Subscribes to new messages; when a message arrives in any of the user's threads,
 * refreshes the inbox so the list and last message preview update in realtime.
 */
export function InboxRealtimeSync() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 150);
    };
    const channel = supabase
      .channel("inbox-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        // Realtime applies RLS; include newly-created threads as well.
        refresh
      )
      .subscribe();
    const refreshVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener("focus", refreshVisible);
    const interval = setInterval(refreshVisible, 15000);

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener("focus", refreshVisible);
      const channelToRemove = channel;
      setTimeout(() => {
        supabase.removeChannel(channelToRemove);
      }, 0);
    };
  }, [router]);

  return null;
}
