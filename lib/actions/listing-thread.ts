"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getUser } from "@/lib/auth";

/**
 * Get or create a listing thread between current user and the listing's seller.
 * context_type = "listing", listing_id = listingId.
 * Canonical pair: user1_id < user2_id.
 */
export async function getOrCreateListingThread(listingId: string) {
  const user = await getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/listing/${listingId}`)}`);
  }

  const supabase = await createSupabaseServerClient();

  // Get listing to find seller
  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_id")
    .eq("id", listingId)
    .single();

  if (!listing) {
    redirect(`/listing/${listingId}?error=not_found`);
  }

  if (listing.seller_id === user.id) {
    redirect(`/listing/${listingId}`);
  }

  const currentId = user.id;
  const sellerId = listing.seller_id;
  const [user1Id, user2Id] =
    currentId < sellerId ? [currentId, sellerId] : [sellerId, currentId];

  // Check for existing thread for this listing between these users
  const { data: existing } = await supabase
    .from("threads")
    .select("id")
    .eq("context_type", "listing")
    .eq("listing_id", listingId)
    .eq("user1_id", user1Id)
    .eq("user2_id", user2Id)
    .maybeSingle();

  if (existing) {
    redirect(`/chat/${existing.id}`);
  }

  const { data: inserted, error } = await supabase
    .from("threads")
    .insert({
      context_type: "listing",
      listing_id: listingId,
      wanted_request_id: null,
      user1_id: user1Id,
      user2_id: user2Id,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    redirect(`/listing/${listingId}?error=thread`);
  }

  redirect(`/chat/${inserted.id}`);
}

/**
 * Form action wrapper.
 */
export async function getOrCreateListingThreadFormAction(formData: FormData) {
  const listingId = formData.get("listingId");
  if (typeof listingId !== "string" || !listingId) return;
  await getOrCreateListingThread(listingId);
}

/** Returns existing thread id if one exists for this user and listing; otherwise null. */
export async function getListingThreadIdIfExists(
  listingId: string,
  userId: string
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("seller_id")
    .eq("id", listingId)
    .single();
  if (!listing) return null;
  const [user1Id, user2Id] =
    userId < listing.seller_id
      ? [userId, listing.seller_id]
      : [listing.seller_id, userId];
  const { data: thread } = await supabase
    .from("threads")
    .select("id")
    .eq("context_type", "listing")
    .eq("listing_id", listingId)
    .eq("user1_id", user1Id)
    .eq("user2_id", user2Id)
    .maybeSingle();
  return thread?.id ?? null;
}

export type ListingOfferType = "price" | "swap";

export type CreateListingOfferResult =
  | { ok: true; threadId: string }
  | { ok: false; error: string };

/**
 * Create listing thread (if not exists) and send first message as offer (price or swap).
 * Caller should redirect to /chat/{threadId} on ok.
 */
export async function createListingThreadWithOffer(
  listingId: string,
  offerType: ListingOfferType,
  amount?: number,
  swapBody?: string
): Promise<CreateListingOfferResult> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Prihláste sa." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_id")
    .eq("id", listingId)
    .single();

  if (!listing) return { ok: false, error: "Inzerát neexistuje." };
  if (listing.seller_id === user.id) return { ok: false, error: "Nemôžete reagovať na vlastný inzerát." };

  const [user1Id, user2Id] =
    user.id < listing.seller_id
      ? [user.id, listing.seller_id]
      : [listing.seller_id, user.id];

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
    .eq("context_type", "listing")
    .eq("listing_id", listingId)
    .eq("user1_id", user1Id)
    .eq("user2_id", user2Id)
    .maybeSingle();

  let threadId: string;
  if (existing) {
    threadId = existing.id;
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("threads")
      .insert({
        context_type: "listing",
        listing_id: listingId,
        wanted_request_id: null,
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
