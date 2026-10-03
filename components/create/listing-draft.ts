import { SLOVAK_REGIONS } from "@/lib/regions";
import { parseEuroAmountStrict } from "@/lib/money-validation";

export type DraftPhoto = {
  url: string;
  storagePath: string;
};

export type ListingDraft = {
  type: "fixed" | "auction";
  swapEnabled: boolean;
  category: "plant" | "accessory";
  photos: DraftPhoto[];
  plantName: string;
  plantTaxonId: string | null;
  region: string;
  district: string;
  condition: string;
  size: string;
  notes: string;
  fixedPrice: string;
  auctionStartPrice: string;
  auctionMinIncrement: string;
  auctionDuration: "24h" | "48h" | "7d";
};

export type StepErrors = Record<string, string>;

export const TOTAL_STEPS = 6;

export function getDraftStorageKey(userId: string): string {
  return `rootie_listing_draft:${userId}`;
}

export const DEFAULT_DRAFT: ListingDraft = {
  type: "fixed",
  swapEnabled: false,
  category: "plant",
  photos: [],
  plantName: "",
  plantTaxonId: null,
  region: "",
  district: "",
  condition: "",
  size: "",
  notes: "",
  fixedPrice: "",
  auctionStartPrice: "",
  auctionMinIncrement: "1",
  auctionDuration: "24h",
};

export function restoreDraft(value: unknown, userId: string, defaultRegion: string): ListingDraft {
  const restored = { ...DEFAULT_DRAFT, region: defaultRegion, photos: [] as DraftPhoto[] };
  if (!value || typeof value !== "object" || Array.isArray(value)) return restored;
  const input = value as Record<string, unknown>;
  for (const key of ["plantName", "region", "district", "condition", "size", "notes", "fixedPrice", "auctionStartPrice", "auctionMinIncrement"] as const) {
    if (typeof input[key] === "string") restored[key] = input[key];
  }
  if (input.type === "fixed" || input.type === "auction") restored.type = input.type;
  if (input.category === "plant" || input.category === "accessory") restored.category = input.category;
  if (typeof input.swapEnabled === "boolean") restored.swapEnabled = input.swapEnabled;
  if (typeof input.plantTaxonId === "string") restored.plantTaxonId = input.plantTaxonId;
  if (input.auctionDuration === "24h" || input.auctionDuration === "48h" || input.auctionDuration === "7d") restored.auctionDuration = input.auctionDuration;
  if (Array.isArray(input.photos)) {
    restored.photos = input.photos.filter((photo): photo is DraftPhoto => {
      if (!photo || typeof photo !== "object") return false;
      if (typeof photo.url !== "string" || typeof photo.storagePath !== "string" || !photo.storagePath.startsWith(`${userId}/`)) return false;
      try {
        const url = new URL(photo.url);
        return url.protocol === "https:" && !url.username && !url.password &&
          url.pathname === `/storage/v1/object/public/listing-photos/${photo.storagePath}`;
      } catch {
        return false;
      }
    }).slice(0, 10);
  }
  return restored;
}

export function validateStep(step: number, draft: ListingDraft): StepErrors {
  const errors: StepErrors = {};

  switch (step) {
    case 0:
      break;

    case 1:
      if (draft.photos.length === 0) {
        errors.photos = "Pridajte aspoň jednu fotku.";
      }
      break;

    case 2:
      if (!draft.plantName.trim()) {
        errors.plantName = "Zadajte názov rastliny.";
      }
      break;

    case 3:
      if (!(SLOVAK_REGIONS as readonly string[]).includes(draft.region)) {
        errors.region = "Vyberte kraj.";
      }
      break;

    case 4:
      if (draft.type === "fixed") {
        const price = parseEuroAmountStrict(draft.fixedPrice);
        if (price == null || price <= 0) {
          errors.fixedPrice = "Zadajte platnú cenu.";
        }
      } else {
        const start = parseEuroAmountStrict(draft.auctionStartPrice);
        if (start == null || start <= 0) {
          errors.auctionStartPrice = "Zadajte platnú začiatočnú cenu.";
        }
        const incr = parseEuroAmountStrict(draft.auctionMinIncrement);
        if (incr == null || incr <= 0) {
          errors.auctionMinIncrement = "Zadajte platný minimálny príhoz.";
        }
      }
      break;

    default:
      break;
  }

  return errors;
}

export function validateAll(draft: ListingDraft): StepErrors {
  let allErrors: StepErrors = {};
  for (let i = 0; i < TOTAL_STEPS - 1; i++) {
    allErrors = { ...allErrors, ...validateStep(i, draft) };
  }
  return allErrors;
}
