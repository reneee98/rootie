export const SLOVAK_REGIONS = [
  "Bratislavský kraj",
  "Trnavský kraj",
  "Trenčiansky kraj",
  "Nitriansky kraj",
  "Žilinský kraj",
  "Banskobystrický kraj",
  "Prešovský kraj",
  "Košický kraj",
] as const;

export const ROOTIE_REGIONS = ["All Slovakia", ...SLOVAK_REGIONS] as const;

export type RootieRegion = (typeof ROOTIE_REGIONS)[number];

/** Short label for region pill: "Bratislavský kraj" → "Bratislavský", "All Slovakia" → "Celé Slovensko" */
export function getRegionShortLabel(region: string): string {
  if (region === "All Slovakia") return "Celé Slovensko";
  return region.replace(/\s*kraj$/i, "").trim() || region;
}
