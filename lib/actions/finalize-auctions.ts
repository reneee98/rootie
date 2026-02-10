"use server";

import { createSupabaseServiceRoleClient } from "@/lib/supabaseClient";

export type FinalizeAuctionsResult = {
  ok: true;
  finalized: number;
  expired: number;
} | { ok: false; error: string };

/**
 * Finds auctions that have ended (auction_ends_at <= now), sets listing status to sold/expired,
 * creates or reuses a thread between seller and winner, and sets deal_confirmed_at so the
 * winner is in the same state as after "Potvrdiť dohodu". Use with service role only (cron).
 */
export async function finalizeEndedAuctions(): Promise<FinalizeAuctionsResult> {
  const supabase = createSupabaseServiceRoleClient();

  const now = new Date().toISOString();

  const { data: endedListings, error: fetchErr } = await supabase
    .from("listings")
    .select("id, seller_id")
    .eq("type", "auction")
    .eq("status", "active")
    .lte("auction_ends_at", now);

  if (fetchErr) {
    return { ok: false, error: fetchErr.message };
  }

  if (!endedListings?.length) {
    return { ok: true, finalized: 0, expired: 0 };
  }

  let finalized = 0;
  let expired = 0;

  for (const listing of endedListings) {
    const { data: topBids } = await supabase
      .from("bids")
      .select("bidder_id")
      .eq("listing_id", listing.id)
      .order("amount", { ascending: false })
      .limit(1);

    const winnerId = topBids?.[0]?.bidder_id ?? null;

    if (!winnerId) {
      const { error: updateErr } = await supabase
        .from("listings")
        .update({ status: "expired", updated_at: now })
        .eq("id", listing.id);
      if (!updateErr) expired += 1;
      continue;
    }

    const sellerId = listing.seller_id;
    const [user1Id, user2Id] =
      sellerId < winnerId ? [sellerId, winnerId] : [winnerId, sellerId];

    const { data: existingThread } = await supabase
      .from("threads")
      .select("id")
      .eq("context_type", "listing")
      .eq("listing_id", listing.id)
      .eq("user1_id", user1Id)
      .eq("user2_id", user2Id)
      .maybeSingle();

    let threadId: string;

    if (existingThread) {
      threadId = existingThread.id;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("threads")
        .insert({
          context_type: "listing",
          listing_id: listing.id,
          wanted_request_id: null,
          user1_id: user1Id,
          user2_id: user2Id,
        })
        .select("id")
        .single();

      if (insertErr || !inserted) {
        continue;
      }
      threadId = inserted.id;
    }

    const confirmedAt = now;

    await supabase.from("thread_deal_confirmations").upsert(
      [
        { thread_id: threadId, user_id: sellerId, confirmed_at: confirmedAt },
        { thread_id: threadId, user_id: winnerId, confirmed_at: confirmedAt },
      ],
      { onConflict: "thread_id,user_id" }
    );

    await supabase
      .from("threads")
      .update({
        deal_confirmed_at: confirmedAt,
        updated_at: confirmedAt,
      })
      .eq("id", threadId);

    const { error: soldErr } = await supabase
      .from("listings")
      .update({ status: "sold", updated_at: now })
      .eq("id", listing.id);

    if (!soldErr) finalized += 1;
  }

  return { ok: true, finalized, expired };
}
