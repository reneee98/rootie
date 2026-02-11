"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getUser } from "@/lib/auth";

/**
 * Get or create a wanted thread between current user (offerer) and the wanted request owner.
 * context_type = "wanted", wanted_request_id = wantedId.
 * user1_id / user2_id = canonical order of owner and current user.
 */
export async function getOrCreateWantedThread(wantedId: string) {
  const user = await getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/wanted/${wantedId}`)}`);
  }

  const supabase = await createSupabaseServerClient();

  const { data: wanted } = await supabase
    .from("wanted_requests")
    .select("id, user_id, status")
    .eq("id", wantedId)
    .single();

  if (!wanted) {
    redirect(`/wanted/${wantedId}?error=not_found`);
  }

  if (wanted.status !== "active") {
    redirect(`/wanted/${wantedId}?error=inactive`);
  }

  const ownerId = wanted.user_id;
  if (ownerId === user.id) {
    redirect(`/wanted/${wantedId}`);
  }

  const [user1Id, user2Id] =
    user.id < ownerId ? [user.id, ownerId] : [ownerId, user.id];

  const { data: existing } = await supabase
    .from("threads")
    .select("id")
    .eq("context_type", "wanted")
    .eq("wanted_request_id", wantedId)
    .eq("user1_id", user1Id)
    .eq("user2_id", user2Id)
    .maybeSingle();

  if (existing) {
    redirect(`/chat/${existing.id}`);
  }

  const { data: inserted, error } = await supabase
    .from("threads")
    .insert({
      context_type: "wanted",
      listing_id: null,
      wanted_request_id: wantedId,
      user1_id: user1Id,
      user2_id: user2Id,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    redirect(`/wanted/${wantedId}?error=thread`);
  }

  redirect(`/chat/${inserted.id}`);
}

export async function getOrCreateWantedThreadFormAction(formData: FormData) {
  const wantedId = formData.get("wantedId");
  if (typeof wantedId !== "string" || !wantedId) return;
  await getOrCreateWantedThread(wantedId);
}

/** Returns existing thread id if one exists for this user and wanted; otherwise null. */
export async function getWantedThreadIdIfExists(
  wantedId: string,
  userId: string
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: wanted } = await supabase
    .from("wanted_requests")
    .select("user_id")
    .eq("id", wantedId)
    .single();
  if (!wanted) return null;
  const ownerId = wanted.user_id;
  const [user1Id, user2Id] =
    userId < ownerId ? [userId, ownerId] : [ownerId, userId];
  const { data: thread } = await supabase
    .from("threads")
    .select("id")
    .eq("context_type", "wanted")
    .eq("wanted_request_id", wantedId)
    .eq("user1_id", user1Id)
    .eq("user2_id", user2Id)
    .maybeSingle();
  return thread?.id ?? null;
}

export type WantedOfferType = "price" | "swap";

export type CreateWantedOfferResult =
  | { ok: true; threadId: string }
  | { ok: false; error: string };

/**
 * Create wanted thread (if not exists) and send first message as offer (price or swap).
 * Caller should redirect to /chat/{threadId} on ok.
 */
export async function createWantedThreadWithOffer(
  wantedId: string,
  offerType: WantedOfferType,
  amount?: number,
  swapBody?: string
): Promise<CreateWantedOfferResult> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Prihláste sa." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: wanted } = await supabase
    .from("wanted_requests")
    .select("id, user_id, status")
    .eq("id", wantedId)
    .single();

  if (!wanted) return { ok: false, error: "Požiadavka neexistuje." };
  if (wanted.status !== "active") return { ok: false, error: "Požiadavka už nie je aktívna." };
  if (wanted.user_id === user.id) return { ok: false, error: "Nemôžete poslať ponuku na vlastnú požiadavku." };

  const ownerId = wanted.user_id;
  const [user1Id, user2Id] =
    user.id < ownerId ? [user.id, ownerId] : [ownerId, user.id];

  if (offerType === "price") {
    const num = amount ?? NaN;
    if (isNaN(num) || num <= 0) return { ok: false, error: "Zadajte platnú sumu." };
  } else {
    const text = (swapBody ?? "").trim();
    if (!text) return { ok: false, error: "Popíšte, čo ponúkate na výmenu." };
  }

  const { data: existing } = await supabase
    .from("threads")
    .select("id")
    .eq("context_type", "wanted")
    .eq("wanted_request_id", wantedId)
    .eq("user1_id", user1Id)
    .eq("user2_id", user2Id)
    .maybeSingle();

  let threadId: string;
  if (existing) {
    threadId = existing.id;
    // Optional: allow sending another offer as message. For "first offer only" we still redirect to chat.
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("threads")
      .insert({
        context_type: "wanted",
        listing_id: null,
        wanted_request_id: wantedId,
        user1_id: user1Id,
        user2_id: user2Id,
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      return { ok: false, error: "Nepodarilo sa vytvoriť konverzáciu." };
    }
    threadId = inserted.id;
  }

  const isNewThread = !existing;
  if (isNewThread) {
    const body = offerType === "price"
      ? String(amount!.toFixed(2))
      : (swapBody ?? "").trim() || "Ponúkam výmenu.";
    const messageType = offerType === "price" ? "offer_price" : "offer_swap";
    const metadata =
      offerType === "price"
        ? { amount_eur: amount! }
        : { swap_for_text: body };

    const { error: msgErr } = await supabase.from("messages").insert({
      thread_id: threadId,
      sender_id: user.id,
      body,
      message_type: messageType,
      metadata,
      attachments: [],
    });

    if (msgErr) {
      return { ok: false, error: "Konverzácia bola vytvorená, ale ponuka sa neodoslala. Skúste napísať v chate." };
    }
    revalidatePath("/inbox");
    revalidatePath(`/chat/${threadId}`);
  }

  return { ok: true, threadId };
}
