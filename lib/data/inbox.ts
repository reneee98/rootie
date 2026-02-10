import { createSupabaseServerClient } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThreadContextType = "listing" | "wanted" | "direct";

export type InboxThreadPreview = {
  id: string;
  context_type: ThreadContextType;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_sender_id: string | null;
  unread_count: number;
  /** Set for listing threads when buyer confirmed "Objednávka doručená" */
  order_delivered_at: string | null;
  other_user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    phone_verified: boolean;
  };
  context_preview:
    | { type: "listing"; listing_id: string; title: string; price: string | null; image_url: string | null }
    | { type: "wanted"; wanted_id: string; plant_name: string; budget_label: string }
    | { type: "direct" };
};

// ---------------------------------------------------------------------------
// Inbox list (threads for current user, sorted by last_message_at, with unread)
// ---------------------------------------------------------------------------

export async function getInboxThreads(
  userId: string
): Promise<InboxThreadPreview[]> {
  const supabase = await createSupabaseServerClient();

  const { data: threads, error } = await supabase
    .from("threads")
    .select(
      `id, context_type, listing_id, wanted_request_id, user1_id, user2_id, last_message_at, order_delivered_at`
    )
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error || !threads?.length) return [];

  const threadIds = threads.map((t) => t.id);
  const otherUserIds = threads.map((t) =>
    t.user1_id === userId ? t.user2_id : t.user1_id
  );

  const [lastMessagesRes, readsRes, profilesRes, listingsRes, wantedsRes] =
    await Promise.all([
      supabase
        .from("messages")
        .select("thread_id, body, sender_id, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("thread_reads")
        .select("thread_id, last_read_at")
        .eq("user_id", userId)
        .in("thread_id", threadIds),
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url, phone_verified")
        .in("id", otherUserIds),
      threads.some((t) => t.listing_id)
        ? supabase
            .from("listings")
            .select("id, plant_name, fixed_price, auction_start_price, type")
            .in(
              "id",
              threads.map((t) => t.listing_id).filter(Boolean) as string[]
            )
        : Promise.resolve({ data: [] }),
      threads.some((t) => t.wanted_request_id)
        ? supabase
            .from("wanted_requests")
            .select("id, plant_name, budget_min, budget_max")
            .in(
              "id",
              threads.map((t) => t.wanted_request_id).filter(Boolean) as string[]
            )
        : Promise.resolve({ data: [] }),
    ]);

  const firstMessagePerThread = new Map<string, { body: string; sender_id: string; created_at: string }>();
  for (const m of lastMessagesRes.data ?? []) {
    if (!firstMessagePerThread.has(m.thread_id)) {
      firstMessagePerThread.set(m.thread_id, {
        body: m.body,
        sender_id: m.sender_id,
        created_at: m.created_at,
      });
    }
  }

  const readsMap = new Map<string, string>();
  for (const r of readsRes.data ?? []) {
    readsMap.set(r.thread_id, r.last_read_at);
  }

  const profilesMap = new Map(
    (profilesRes.data ?? []).map((p) => [
      p.id,
      {
        id: p.id,
        display_name: p.display_name ?? null,
        avatar_url: p.avatar_url ?? null,
        phone_verified: Boolean(p.phone_verified),
      },
    ])
  );

  type ListingPreview = { id: string; title: string; price: string | null };
  const listingsMap = new Map<string, ListingPreview>(
    (listingsRes.data ?? []).map((l: Record<string, unknown>) => {
      const price =
        l.type === "fixed" && l.fixed_price != null
          ? Number(l.fixed_price)
          : l.auction_start_price != null
            ? Number(l.auction_start_price)
            : null;
      return [
        l.id as string,
        {
          id: l.id as string,
          title: String(l.plant_name ?? "Inzerát"),
          price: price != null ? `${price} €` : null,
        },
      ];
    })
  );

  type WantedPreview = { id: string; plant_name: string; budget_label: string };
  const wantedsMap = new Map<string, WantedPreview>(
    (wantedsRes.data ?? []).map((w: Record<string, unknown>) => {
      const min = w.budget_min != null ? Number(w.budget_min) : null;
      const max = w.budget_max != null ? Number(w.budget_max) : null;
      const budget =
        min != null && max != null
          ? `${min}–${max} €`
          : min != null
            ? `Od ${min} €`
            : max != null
              ? `Do ${max} €`
              : "Dohodou";
      return [
        w.id as string,
        {
          id: w.id as string,
          plant_name: String(w.plant_name ?? "Hľadám"),
          budget_label: budget,
        },
      ];
    })
  );

  const listingIds = threads.map((t) => t.listing_id).filter(Boolean) as string[];
  const firstPhotoUrls = new Map<string, string>();
  if (listingIds.length > 0) {
    const { data: photos } = await supabase
      .from("listing_photos")
      .select("listing_id, url")
      .in("listing_id", listingIds)
      .order("position", { ascending: true });
    for (const p of photos ?? []) {
      if (!firstPhotoUrls.has(p.listing_id)) {
        firstPhotoUrls.set(p.listing_id, p.url);
      }
    }
  }

  const result: InboxThreadPreview[] = [];
  for (const t of threads) {
    const otherId = t.user1_id === userId ? t.user2_id : t.user1_id;
    const other = profilesMap.get(otherId);
    if (!other) continue;

    const lastMsg = firstMessagePerThread.get(t.id);
    const lastReadAt = readsMap.get(t.id);
    const unreadCount =
      lastMsg && lastReadAt && lastMsg.sender_id !== userId
        ? await countUnread(supabase, t.id, userId, lastReadAt)
        : lastMsg && lastMsg.sender_id !== userId && !lastReadAt
          ? await countUnread(supabase, t.id, userId, null)
          : 0;

    let context_preview: InboxThreadPreview["context_preview"];
    if (t.context_type === "listing" && t.listing_id) {
      const listing = listingsMap.get(t.listing_id);
      const image_url = firstPhotoUrls.get(t.listing_id) ?? null;
      context_preview = {
        type: "listing",
        listing_id: t.listing_id,
        title: listing?.title ?? "Inzerát",
        price: listing?.price ?? null,
        image_url,
      };
    } else if (t.context_type === "wanted" && t.wanted_request_id) {
      const wanted = wantedsMap.get(t.wanted_request_id);
      context_preview = {
        type: "wanted",
        wanted_id: t.wanted_request_id,
        plant_name: wanted?.plant_name ?? "Hľadám",
        budget_label: wanted?.budget_label ?? "Dohodou",
      };
    } else {
      context_preview = { type: "direct" };
    }

    result.push({
      id: t.id,
      context_type: t.context_type as ThreadContextType,
      last_message_at: t.last_message_at ?? null,
      order_delivered_at: t.order_delivered_at ?? null,
      last_message_preview: lastMsg
        ? (lastMsg.body.length > 60 ? lastMsg.body.slice(0, 60) + "…" : lastMsg.body)
        : null,
      last_message_sender_id: lastMsg?.sender_id ?? null,
      unread_count: unreadCount,
      other_user: other,
      context_preview,
    });
  }

  return result;
}

async function countUnread(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  threadId: string,
  userId: string,
  lastReadAt: string | null
): Promise<number> {
  let q = supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", threadId)
    .neq("sender_id", userId);
  if (lastReadAt) {
    q = q.gt("created_at", lastReadAt);
  }
  const { count } = await q;
  return count ?? 0;
}
