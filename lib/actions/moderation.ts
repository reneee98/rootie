"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getUser } from "@/lib/auth";

export type ModerationResult = { ok: true } | { ok: false; error: string };

async function ensureModerator(): Promise<ModerationResult | null> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Nie ste prihlásený" };

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_moderator")
    .eq("id", user.id)
    .single();

  if (!profile?.is_moderator) {
    return { ok: false, error: "Nemáte oprávnenie moderátora" };
  }
  return null;
}

/**
 * Mark report as resolved. Optional moderator notes.
 */
export async function resolveReport(
  reportId: string,
  moderatorNotes?: string | null
): Promise<ModerationResult> {
  const err = await ensureModerator();
  if (err) return err;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("reports")
    .update({
      status: "resolved",
      moderator_notes: moderatorNotes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/reports");
  return { ok: true };
}

/**
 * Remove the reported listing (set status = removed) and resolve the report.
 * Only for reports with target_type = 'listing'.
 */
export async function removeListingFromReport(
  reportId: string
): Promise<ModerationResult> {
  const err = await ensureModerator();
  if (err) return err;

  const supabase = await createSupabaseServerClient();
  const { data: report } = await supabase
    .from("reports")
    .select("target_type, target_id")
    .eq("id", reportId)
    .single();

  if (!report || report.target_type !== "listing") {
    return { ok: false, error: "Toto nahlásenie nie je na inzerát" };
  }

  const { error: updateListingErr } = await supabase
    .from("listings")
    .update({ status: "removed", updated_at: new Date().toISOString() })
    .eq("id", report.target_id);

  if (updateListingErr) {
    return { ok: false, error: updateListingErr.message };
  }

  await supabase
    .from("reports")
    .update({
      status: "resolved",
      moderator_notes: "Inzerát odstránený.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  revalidatePath("/admin/reports");
  return { ok: true };
}

/**
 * Set warned_at on the subject user (reported user, listing seller, message sender, or thread participant).
 */
export async function warnUserFromReport(
  reportId: string
): Promise<ModerationResult> {
  const err = await ensureModerator();
  if (err) return err;

  const supabase = await createSupabaseServerClient();
  const { data: report } = await supabase
    .from("reports")
    .select("target_type, target_id")
    .eq("id", reportId)
    .single();

  if (!report) return { ok: false, error: "Nahlásenie neexistuje" };

  let userId: string | null = null;
  if (report.target_type === "user") {
    userId = report.target_id;
  } else if (report.target_type === "listing") {
    const { data: listing } = await supabase
      .from("listings")
      .select("seller_id")
      .eq("id", report.target_id)
      .single();
    userId = listing?.seller_id ?? null;
  } else if (report.target_type === "message") {
    const { data: msg } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("id", report.target_id)
      .single();
    userId = msg?.sender_id ?? null;
  } else if (report.target_type === "thread") {
    const { data: thread } = await supabase
      .from("threads")
      .select("user1_id")
      .eq("id", report.target_id)
      .single();
    userId = thread?.user1_id ?? null;
  }

  if (!userId) return { ok: false, error: "Nepodarilo sa určiť používateľa" };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({ warned_at: now, updated_at: now })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };

  await supabase
    .from("reports")
    .update({
      status: "resolved",
      moderator_notes: "Používateľ upozornený.",
      updated_at: now,
    })
    .eq("id", reportId);

  revalidatePath("/admin/reports");
  return { ok: true };
}

/**
 * Set is_banned = true on the subject user and resolve the report.
 */
export async function banUserFromReport(
  reportId: string
): Promise<ModerationResult> {
  const err = await ensureModerator();
  if (err) return err;

  const supabase = await createSupabaseServerClient();
  const { data: report } = await supabase
    .from("reports")
    .select("target_type, target_id")
    .eq("id", reportId)
    .single();

  if (!report) return { ok: false, error: "Nahlásenie neexistuje" };

  let userId: string | null = null;
  if (report.target_type === "user") {
    userId = report.target_id;
  } else if (report.target_type === "listing") {
    const { data: listing } = await supabase
      .from("listings")
      .select("seller_id")
      .eq("id", report.target_id)
      .single();
    userId = listing?.seller_id ?? null;
  } else if (report.target_type === "message") {
    const { data: msg } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("id", report.target_id)
      .single();
    userId = msg?.sender_id ?? null;
  } else if (report.target_type === "thread") {
    const { data: thread } = await supabase
      .from("threads")
      .select("user1_id")
      .eq("id", report.target_id)
      .single();
    userId = thread?.user1_id ?? null;
  }

  if (!userId) return { ok: false, error: "Nepodarilo sa určiť používateľa" };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({ is_banned: true, updated_at: now })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };

  await supabase
    .from("reports")
    .update({
      status: "resolved",
      moderator_notes: "Používateľ zablokovaný.",
      updated_at: now,
    })
    .eq("id", reportId);

  revalidatePath("/admin/reports");
  return { ok: true };
}
