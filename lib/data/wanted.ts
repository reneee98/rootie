import { createSupabaseServerClient } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WantedIntent = "buy" | "swap" | "both";

export type WantedFeedCard = {
  id: string;
  plant_name: string;
  intent: WantedIntent;
  region: string;
  district: string | null;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    region: string | null;
  };
};

export type WantedDetail = {
  id: string;
  user_id: string;
  plant_name: string;
  plant_taxon_id: string | null;
  intent: WantedIntent;
  region: string;
  district: string | null;
  budget_min: number | null;
  budget_max: number | null;
  notes: string | null;
  status: string;
  created_at: string;
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    region: string | null;
  };
};

export type WantedFeedFilters = {
  region?: string;
  query?: string;
  intent?: WantedIntent;
  page?: number;
};

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

export async function getWantedFeed(
  filters: WantedFeedFilters
): Promise<{ items: WantedFeedCard[]; hasMore: boolean }> {
  const supabase = await createSupabaseServerClient();
  const page = filters.page ?? 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE;

  let q = supabase
    .from("wanted_requests")
    .select(
      `id, plant_name, intent, region, district, budget_min, budget_max, created_at,
       user:profiles!wanted_requests_user_id_fkey ( id, display_name, avatar_url, region )`
    )
    .eq("status", "active");

  if (filters.region && filters.region !== "All Slovakia") {
    q = q.eq("region", filters.region);
  }

  if (filters.intent) {
    q = q.eq("intent", filters.intent);
  }

  if (filters.query?.trim()) {
    q = q.ilike("plant_name", `%${filters.query.trim()}%`);
  }

  q = q.order("created_at", { ascending: false }).range(from, to);

  const { data: rows, error } = await q;

  if (error || !rows?.length) {
    return { items: [], hasMore: false };
  }

  const items: WantedFeedCard[] = rows.map((r: Record<string, unknown>) => {
    const user = r.user as Record<string, unknown> | null;
    return {
      id: r.id as string,
      plant_name: r.plant_name as string,
      intent: r.intent as WantedIntent,
      region: r.region as string,
      district: (r.district as string) ?? null,
      budget_min: r.budget_min != null ? Number(r.budget_min) : null,
      budget_max: r.budget_max != null ? Number(r.budget_max) : null,
      created_at: r.created_at as string,
      user: {
        id: (user?.id as string) ?? "",
        display_name: (user?.display_name as string) ?? null,
        avatar_url: (user?.avatar_url as string) ?? null,
        region: (user?.region as string) ?? null,
      },
    };
  });

  return { items, hasMore: rows.length === PAGE_SIZE };
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

export async function getWantedDetail(
  wantedId: string
): Promise<WantedDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data: row, error } = await supabase
    .from("wanted_requests")
    .select(
      `id, user_id, plant_name, plant_taxon_id, intent, region, district, budget_min, budget_max, notes, status, created_at,
       user:profiles!wanted_requests_user_id_fkey ( id, display_name, avatar_url, region )`
    )
    .eq("id", wantedId)
    .maybeSingle();

  if (error || !row) return null;

  const user = row.user as unknown as Record<string, unknown> | null;
  if (!user) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    plant_name: row.plant_name,
    plant_taxon_id: row.plant_taxon_id ?? null,
    intent: row.intent as WantedIntent,
    region: row.region,
    district: row.district ?? null,
    budget_min: row.budget_min != null ? Number(row.budget_min) : null,
    budget_max: row.budget_max != null ? Number(row.budget_max) : null,
    notes: row.notes ?? null,
    status: row.status,
    created_at: row.created_at,
    user: {
      id: user.id as string,
      display_name: (user.display_name as string) ?? null,
      avatar_url: (user.avatar_url as string) ?? null,
      region: (user.region as string) ?? null,
    },
  };
}
