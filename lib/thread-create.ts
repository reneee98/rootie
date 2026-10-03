import type { createSupabaseServerClient } from "@/lib/supabaseClient";

type ThreadInput = {
  context_type: "listing" | "wanted" | "direct";
  listing_id: string | null;
  wanted_request_id: string | null;
  user1_id: string;
  user2_id: string;
};

/** The unique index decides races; a losing insert reuses the winning row. */
export async function findOrCreateThread(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  input: ThreadInput
): Promise<string | null> {
  const find = async () => {
    let query = supabase.from("threads").select("id")
      .eq("context_type", input.context_type)
      .eq("user1_id", input.user1_id).eq("user2_id", input.user2_id);
    if (input.listing_id) query = query.eq("listing_id", input.listing_id);
    if (input.wanted_request_id) query = query.eq("wanted_request_id", input.wanted_request_id);
    const { data, error } = await query.maybeSingle();
    return error ? null : data?.id ?? null;
  };
  const existingId = await find();
  if (existingId) return existingId;
  const { data, error } = await supabase.from("threads").insert(input).select("id").single();
  if (!error && data) return data.id;
  if (error?.code === "23505") return find();
  return null;
}
