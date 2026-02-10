"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getUser } from "@/lib/auth";

/**
 * Get or create a direct thread between the current user and targetUserId.
 * Thread is unique per unordered pair (user1_id, user2_id) with user1_id < user2_id.
 * Redirects to /chat/[threadId] on success; redirects to /login if not authenticated.
 */
export async function getOrCreateDirectThread(targetUserId: string) {
  const user = await getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/profile/${targetUserId}`)}`);
  }

  const currentId = user.id;
  if (currentId === targetUserId) {
    redirect("/me");
  }

  const [user1Id, user2Id] =
    currentId < targetUserId
      ? [currentId, targetUserId]
      : [targetUserId, currentId];

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("threads")
    .select("id")
    .eq("context_type", "direct")
    .eq("user1_id", user1Id)
    .eq("user2_id", user2Id)
    .maybeSingle();

  if (existing) {
    redirect(`/chat/${existing.id}`);
  }

  const { data: inserted, error } = await supabase
    .from("threads")
    .insert({
      context_type: "direct",
      listing_id: null,
      wanted_request_id: null,
      user1_id: user1Id,
      user2_id: user2Id,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    redirect(`/profile/${targetUserId}?error=thread`);
  }

  redirect(`/chat/${inserted.id}`);
}

/**
 * Form action: get or create direct thread. Expects form field "targetUserId".
 */
export async function getOrCreateDirectThreadFormAction(formData: FormData) {
  const targetUserId = formData.get("targetUserId");
  if (typeof targetUserId !== "string" || !targetUserId) {
    return;
  }
  await getOrCreateDirectThread(targetUserId);
}
