"use server";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/auth";
import { SLOVAK_REGIONS } from "@/lib/regions";
import { parseEuroAmountStrict } from "@/lib/money-validation";

export type CreateWantedInput = {
  plantName: string;
  plantTaxonId: string | null;
  region: string;
  district: string;
  budgetMin: string;
  budgetMax: string;
  negotiable: boolean;
  intent: "buy" | "swap" | "both";
  notes: string;
};

export type CreateWantedResult =
  | { ok: true; wantedId: string }
  | { ok: false; error: string };

export async function createWanted(
  input: CreateWantedInput
): Promise<CreateWantedResult> {
  const user = await requireUser("/wanted/create");
  const supabase = await createSupabaseServerClient();

  if (!input || typeof input.plantName !== "string" || !input.plantName.trim() || input.plantName.length > 200) {
    return { ok: false, error: "Názov rastliny je povinný." };
  }

  if (!["buy", "swap", "both"].includes(input.intent) || typeof input.negotiable !== "boolean" ||
      typeof input.budgetMin !== "string" || typeof input.budgetMax !== "string" ||
      typeof input.district !== "string" || typeof input.notes !== "string" || input.notes.length > 5000) {
    return { ok: false, error: "Neplatné údaje požiadavky." };
  }

  if (
    !input.region ||
    !(SLOVAK_REGIONS as readonly string[]).includes(input.region)
  ) {
    return { ok: false, error: "Vyberte platný kraj." };
  }

  let budgetMin: number | null = null;
  let budgetMax: number | null = null;
  if (!input.negotiable) {
    budgetMin = input.budgetMin.trim() ? parseEuroAmountStrict(input.budgetMin) : null;
    budgetMax = input.budgetMax.trim() ? parseEuroAmountStrict(input.budgetMax) : null;
    if ((input.budgetMin.trim() && budgetMin == null) || (input.budgetMax.trim() && budgetMax == null)) {
      return { ok: false, error: "Zadajte platný rozpočet s najviac dvoma desatinnými miestami." };
    }
    if (budgetMin != null && budgetMax != null && budgetMin > budgetMax) {
      return { ok: false, error: "Minimálny rozpočet nemôže byť vyšší ako maximálny." };
    }
  }

  const { data: row, error } = await supabase
    .from("wanted_requests")
    .insert({
      user_id: user.id,
      plant_name: input.plantName.trim(),
      plant_taxon_id: input.plantTaxonId || null,
      region: input.region,
      district: input.district.trim() || null,
      budget_min: budgetMin,
      budget_max: budgetMax,
      intent: input.intent,
      notes: input.notes.trim() || null,
    })
    .select("id")
    .single();

  if (error || !row) {
    console.error("Wanted insert error:", error);
    return { ok: false, error: "Nepodarilo sa vytvoriť požiadavku. Skúste to znova." };
  }

  return { ok: true, wantedId: row.id };
}
