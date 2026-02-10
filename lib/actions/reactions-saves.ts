"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getUser } from "@/lib/auth";
import type { ReactionType } from "@/lib/data/listings";

const REACTION_TYPES: ReactionType[] = ["like", "want", "wow", "funny", "sad"];

function isValidReaction(value: string): value is ReactionType {
  return REACTION_TYPES.includes(value as ReactionType);
}

export type ReactionResult = { ok: true } | { ok: false; error: string };

/**
 * Set or change the current user's reaction on a listing.
 * One reaction per user per listing; passing null removes the reaction.
 */
export async function saveReaction(
  listingId: string,
  reactionType: ReactionType | null
): Promise<ReactionResult> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Prihláste sa" };
  }

  const supabase = await createSupabaseServerClient();

  if (reactionType === null) {
    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("listing_id", listingId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/listing/${listingId}`);
    revalidatePath("/");
    return { ok: true };
  }

  if (!isValidReaction(reactionType)) {
    return { ok: false, error: "Neplatný typ reakcie" };
  }

  const { error } = await supabase.from("reactions").upsert(
    {
      listing_id: listingId,
      user_id: user.id,
      reaction_type: reactionType,
    },
    { onConflict: "listing_id,user_id" }
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/listing/${listingId}`);
  revalidatePath("/");
  return { ok: true };
}

export type ToggleSaveResult = { ok: true; is_saved: boolean } | { ok: false; error: string };

/**
 * Toggle save (bookmark) for the current user on a listing.
 */
export async function toggleSave(listingId: string): Promise<ToggleSaveResult> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Prihláste sa" };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("saved_listings")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/listing/${listingId}`);
    revalidatePath("/saved");
    revalidatePath("/");
    return { ok: true, is_saved: false };
  }

  const { error } = await supabase.from("saved_listings").insert({
    user_id: user.id,
    listing_id: listingId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/listing/${listingId}`);
  revalidatePath("/saved");
  revalidatePath("/");
  return { ok: true, is_saved: true };
}
