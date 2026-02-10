"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getUser } from "@/lib/auth";

export type ReportResult = { ok: true } | { ok: false; error: string };

const REPORT_REASONS = [
  "spam",
  "harassment",
  "scam",
  "inappropriate_content",
  "other",
] as const;

export async function getReportReasons(): Promise<readonly string[]> {
  return REPORT_REASONS;
}

/**
 * Report a user. Caller must be authenticated.
 * target_type = 'user', target_id = reported user's id.
 */
export async function reportUser(
  targetUserId: string,
  reason: string,
  details?: string | null
): Promise<ReportResult> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  if (user.id === targetUserId) {
    return { ok: false, error: "Cannot report yourself" };
  }

  const validReason =
    REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number]) ||
    reason;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: "user",
    target_id: targetUserId,
    reason: validReason,
    details: details ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/profile/[userId]", "page");
  return { ok: true };
}

export type ReportFormState = { ok: true } | { ok: false; error: string };

/**
 * Form action for report dialog. Expects formData fields: targetUserId, reason, details (optional).
 */
export async function reportUserFormAction(
  _prev: ReportFormState | null,
  formData: FormData
): Promise<ReportFormState> {
  const targetUserId = formData.get("targetUserId");
  if (typeof targetUserId !== "string" || !targetUserId) {
    return { ok: false, error: "Missing user" };
  }
  const reason = (formData.get("reason") as string)?.trim() || "other";
  const details = (formData.get("details") as string)?.trim() || null;
  return reportUser(targetUserId, reason, details);
}

// ---------------------------------------------------------------------------
// Report listing
// ---------------------------------------------------------------------------

export async function reportListing(
  listingId: string,
  reason: string,
  details?: string | null
): Promise<ReportResult> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const validReason =
    REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number]) ||
    reason;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: "listing",
    target_id: listingId,
    reason: validReason,
    details: details ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/listing/[id]", "page");
  return { ok: true };
}

export async function reportListingFormAction(
  _prev: ReportFormState | null,
  formData: FormData
): Promise<ReportFormState> {
  const listingId = formData.get("listingId");
  if (typeof listingId !== "string" || !listingId) {
    return { ok: false, error: "Missing listing" };
  }
  const reason = (formData.get("reason") as string)?.trim() || "other";
  const details = (formData.get("details") as string)?.trim() || null;
  return reportListing(listingId, reason, details);
}

// ---------------------------------------------------------------------------
// Report message
// ---------------------------------------------------------------------------

export async function reportMessage(
  messageId: string,
  reason: string,
  details?: string | null
): Promise<ReportResult> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const validReason =
    REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number]) ||
    reason;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: "message",
    target_id: messageId,
    reason: validReason,
    details: details ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/inbox");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Report thread (conversation)
// ---------------------------------------------------------------------------

export async function reportThread(
  threadId: string,
  reason: string,
  details?: string | null
): Promise<ReportResult> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const validReason =
    REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number]) ||
    reason;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: "thread",
    target_id: threadId,
    reason: validReason,
    details: details ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/inbox");
  return { ok: true };
}
