"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getUser } from "@/lib/auth";

export type BlockResult = { ok: true } | { ok: false; error: string };

/**
 * Block a user. Caller must be authenticated.
 * Idempotent: if already blocked, returns ok (unique constraint).
 */
export async function blockUser(blockedUserId: string): Promise<BlockResult> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  if (user.id === blockedUserId) {
    return { ok: false, error: "Cannot block yourself" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("blocks").insert({
    blocker_id: user.id,
    blocked_id: blockedUserId,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/profile/[userId]", "page");
  revalidatePath("/inbox");
  return { ok: true };
}
