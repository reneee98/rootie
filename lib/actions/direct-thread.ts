"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getUser } from "@/lib/auth";
import { findOrCreateThread } from "@/lib/thread-create";

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

  const threadId = await findOrCreateThread(supabase, {
    context_type: "direct", listing_id: null, wanted_request_id: null,
    user1_id: user1Id, user2_id: user2Id,
  });
  if (!threadId) redirect(`/profile/${targetUserId}?error=thread`);
  redirect(`/chat/${threadId}`);
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
