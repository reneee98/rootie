"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getUser } from "@/lib/auth";
import {
  getReviewEligibility,
  getThreadDealState,
} from "@/lib/data/reviews";

export type ConfirmDealResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Current user confirms the deal. For listing threads only the seller can confirm.
 * Idempotent (already confirmed = ok).
 */
export async function confirmDeal(
  threadId: string
): Promise<ConfirmDealResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Prihláste sa" };

  const supabase = await createSupabaseServerClient();

  const { data: thread, error: threadErr } = await supabase
    .from("threads")
    .select("id, user1_id, user2_id, context_type, listing_id")
    .eq("id", threadId)
    .single();

  if (threadErr || !thread) {
    return { ok: false, error: "Konverzácia neexistuje" };
  }

  const isParticipant =
    thread.user1_id === user.id || thread.user2_id === user.id;
  if (!isParticipant) {
    return { ok: false, error: "Nie ste účastník konverzácie" };
  }

  let isListingSeller = false;
  if (thread.context_type === "listing" && thread.listing_id) {
    const { data: listing } = await supabase
      .from("listings")
      .select("seller_id")
      .eq("id", thread.listing_id)
      .single();
    if (listing?.seller_id !== user.id) {
      return { ok: false, error: "Dohodu môže potvrdiť len predajca." };
    }
    isListingSeller = true;
  }

  const { error: upsertError } = await supabase
    .from("thread_deal_confirmations")
    .upsert(
      {
        thread_id: threadId,
        user_id: user.id,
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: "thread_id,user_id" }
    );

  if (upsertError) {
    return { ok: false, error: upsertError.message };
  }

  // Listing: set deal_confirmed_at in app so it works when upsert does UPDATE (trigger runs only on INSERT).
  if (isListingSeller) {
    const { error: updateErr } = await supabase
      .from("threads")
      .update({
        deal_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId);

    if (updateErr) {
      return { ok: false, error: `Potvrdenie sa nepodarilo: ${updateErr.message}` };
    }
  }

  revalidatePath(`/chat/${threadId}`);
  revalidatePath("/inbox");
  return { ok: true };
}

export type ConfirmOrderDeliveredResult =
  | { ok: true }
  | { ok: false; error: string };

function isMissingThreadOrderDeliveredAtColumnError(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;

  const isMissingColumnCode =
    error.code === "42703" || error.code === "PGRST204";
  return isMissingColumnCode && (error.message ?? "").includes("order_delivered_at");
}

/**
 * Buyer confirms that the order was delivered. Only buyer (non-seller) in a listing thread
 * can confirm; deal must already be confirmed. Idempotent.
 */
export async function confirmOrderDelivered(
  threadId: string
): Promise<ConfirmOrderDeliveredResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Prihláste sa" };

  const supabase = await createSupabaseServerClient();

  const { data: thread, error: threadErr } = await supabase
    .from("threads")
    .select("id, user1_id, user2_id, context_type, listing_id, deal_confirmed_at")
    .eq("id", threadId)
    .single();

  if (threadErr || !thread) {
    return { ok: false, error: "Konverzácia neexistuje" };
  }

  const isParticipant =
    thread.user1_id === user.id || thread.user2_id === user.id;
  if (!isParticipant) {
    return { ok: false, error: "Nie ste účastník konverzácie" };
  }

  if (thread.context_type !== "listing" || !thread.listing_id) {
    return { ok: false, error: "Doručenie môžete potvrdiť len v konverzácii k inzerátu." };
  }

  if (!thread.deal_confirmed_at) {
    return { ok: false, error: "Dohoda ešte nebola potvrdená." };
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("seller_id")
    .eq("id", thread.listing_id)
    .single();

  if (listing?.seller_id === user.id) {
    return { ok: false, error: "Doručenie môže potvrdiť len kupujúci." };
  }

  const { error: updateErr } = await supabase
    .from("threads")
    .update({
      order_delivered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId);

  if (updateErr && !isMissingThreadOrderDeliveredAtColumnError(updateErr)) {
    return { ok: false, error: updateErr.message };
  }

  revalidatePath(`/chat/${threadId}`);
  revalidatePath("/inbox");
  return { ok: true };
}

export type SubmitReviewResult = { ok: true } | { ok: false; error: string };

/**
 * Submit a review for a seller on a listing. Enforces eligibility server-side.
 */
export async function submitReview(
  sellerId: string,
  listingId: string,
  threadId: string,
  rating: number,
  body: string | null
): Promise<SubmitReviewResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Prihláste sa" };

  if (rating < 1 || rating > 5) {
    return { ok: false, error: "Hodnotenie musí byť 1–5" };
  }

  const eligibility = await getReviewEligibility(
    threadId,
    listingId,
    user.id,
    sellerId
  );

  if (!eligibility.eligible) {
    return {
      ok: false,
      error: eligibility.reason ?? "Nemôžete hodnotiť tohto predajcu za tento inzerát.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("reviews").insert({
    reviewer_id: user.id,
    seller_id: sellerId,
    listing_id: listingId,
    thread_id: threadId,
    rating,
    body: body?.trim() || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Už ste hodnotili tento inzerát." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/profile/${sellerId}`);
  revalidatePath(`/listing/${listingId}`);
  revalidatePath(`/chat/${threadId}`);
  revalidatePath("/inbox");
  return { ok: true };
}
