"use server";

import { createSupabaseServerClient } from "@/lib/supabaseClient";

export type PlantTaxonResult = {
  id: string;
  canonical_name: string;
  synonyms: string[];
};

export async function searchPlantTaxa(
  query: string
): Promise<PlantTaxonResult[]> {
  if (!query || query.trim().length < 2) return [];

  const supabase = await createSupabaseServerClient();
  const term = query.trim();

  const { data, error } = await supabase
    .from("plant_taxa")
    .select("id, canonical_name, synonyms")
    .ilike("canonical_name", `%${term}%`)
    .order("popularity_score", { ascending: false })
    .limit(8);

  if (error) return [];
  return data ?? [];
}
