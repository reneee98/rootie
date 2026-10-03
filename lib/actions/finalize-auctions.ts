import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabaseClient";

export type FinalizeAuctionsResult =
  | { ok: true; finalized: number; expired: number }
  | { ok: false; error: string };

/** Called only by the authenticated cron route, never exposed as a server action. */
export async function finalizeEndedAuctions(): Promise<FinalizeAuctionsResult> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("finalize_ended_auctions");
  if (error) return { ok: false, error: error.message };
  return { ok: true, finalized: Number(data?.finalized ?? 0), expired: Number(data?.expired ?? 0) };
}
