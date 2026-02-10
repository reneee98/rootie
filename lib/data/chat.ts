import { createSupabaseServerClient } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MessageType = "text" | "offer_price" | "offer_swap" | "system";

export type ChatMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  message_type: MessageType;
  metadata: Record<string, unknown>;
  attachments: { url: string; type?: string }[];
  created_at: string;
};

export type ThreadDetail = {
  id: string;
  context_type: "listing" | "wanted" | "direct";
  listing_id: string | null;
  wanted_request_id: string | null;
  user1_id: string;
  user2_id: string;
  other_user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    phone_verified: boolean;
  };
  context_card:
    | {
        type: "listing";
        listing_id: string;
        title: string;
        price: string | null;
        image_url: string | null;
        href: string;
      }
    | {
        type: "wanted";
        wanted_id: string;
        plant_name: string;
        budget_label: string;
        href: string;
      }
    | { type: "direct" };
};

const MESSAGE_PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Thread detail for chat header
// ---------------------------------------------------------------------------

export async function getThreadDetail(
  threadId: string,
  userId: string
): Promise<ThreadDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data: thread, error } = await supabase
    .from("threads")
    .select(
      "id, context_type, listing_id, wanted_request_id, user1_id, user2_id"
    )
    .eq("id", threadId)
    .maybeSingle();

  if (error || !thread) return null;
  const otherId = thread.user1_id === userId ? thread.user2_id : thread.user1_id;

  const { data: other } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, phone_verified")
    .eq("id", otherId)
    .single();

  if (!other) return null;

  let context_card: ThreadDetail["context_card"];
  if (thread.context_type === "listing" && thread.listing_id) {
    const { data: listing } = await supabase
      .from("listings")
      .select("id, plant_name, fixed_price, auction_start_price, type")
      .eq("id", thread.listing_id)
      .single();
    const price =
      listing?.type === "fixed" && listing?.fixed_price != null
        ? `${Number(listing.fixed_price)} €`
        : listing?.auction_start_price != null
          ? `Od ${Number(listing.auction_start_price)} €`
          : null;
    const { data: photos } = await supabase
      .from("listing_photos")
      .select("url")
      .eq("listing_id", thread.listing_id)
      .order("position", { ascending: true })
      .limit(1);
    context_card = {
      type: "listing",
      listing_id: thread.listing_id,
      title: listing?.plant_name ?? "Inzerát",
      price,
      image_url: photos?.[0]?.url ?? null,
      href: `/listing/${thread.listing_id}`,
    };
  } else if (thread.context_type === "wanted" && thread.wanted_request_id) {
    const { data: wanted } = await supabase
      .from("wanted_requests")
      .select("id, plant_name, budget_min, budget_max")
      .eq("id", thread.wanted_request_id)
      .single();
    const min = wanted?.budget_min != null ? Number(wanted.budget_min) : null;
    const max = wanted?.budget_max != null ? Number(wanted.budget_max) : null;
    const budget_label =
      min != null && max != null
        ? `${min}–${max} €`
        : min != null
          ? `Od ${min} €`
          : max != null
            ? `Do ${max} €`
            : "Dohodou";
    context_card = {
      type: "wanted",
      wanted_id: thread.wanted_request_id,
      plant_name: wanted?.plant_name ?? "Hľadám",
      budget_label,
      href: `/wanted/${thread.wanted_request_id}`,
    };
  } else {
    context_card = { type: "direct" };
  }

  return {
    id: thread.id,
    context_type: thread.context_type as ThreadDetail["context_type"],
    listing_id: thread.listing_id,
    wanted_request_id: thread.wanted_request_id,
    user1_id: thread.user1_id,
    user2_id: thread.user2_id,
    other_user: {
      id: other.id,
      display_name: other.display_name ?? null,
      avatar_url: other.avatar_url ?? null,
      phone_verified: Boolean(other.phone_verified),
    },
    context_card,
  };
}

// ---------------------------------------------------------------------------
// Messages (paginated, oldest first for display, so we fetch desc and reverse)
// ---------------------------------------------------------------------------

export async function getMessages(
  threadId: string,
  userId: string,
  before?: string,
  limit: number = MESSAGE_PAGE_SIZE
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const supabase = await createSupabaseServerClient();

  let q = supabase
    .from("messages")
    .select("id, thread_id, sender_id, body, message_type, metadata, attachments, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (before) {
    q = q.lt("created_at", before);
  }

  const { data: rows, error } = await q;

  if (error) return { messages: [], hasMore: false };
  const list = rows ?? [];
  const hasMore = list.length > limit;
  const slice = hasMore ? list.slice(0, limit) : list;
  const messages: ChatMessage[] = slice.reverse().map((m) => ({
    id: m.id,
    thread_id: m.thread_id,
    sender_id: m.sender_id,
    body: m.body,
    message_type: (m.message_type as MessageType) ?? "text",
    metadata: (m.metadata as Record<string, unknown>) ?? {},
    attachments: Array.isArray(m.attachments)
      ? (m.attachments as { url: string; type?: string }[])
      : [],
    created_at: m.created_at,
  }));

  return { messages, hasMore };
}
