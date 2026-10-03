import type { CreateListingInput } from "@/lib/actions/create-listing";
import { isValidEuroAmount } from "@/lib/money-validation";
import { SLOVAK_REGIONS } from "@/lib/regions";

export function validateCreateListingInput(input: CreateListingInput, now = new Date()): string | null {
  if (!input || typeof input !== "object" || !["fixed", "auction"].includes(input.type) ||
      !["plant", "accessory"].includes(input.category) || typeof input.swapEnabled !== "boolean") {
    return "Neplatné údaje inzerátu.";
  }
  if (typeof input.plantName !== "string" || !input.plantName.trim() || input.plantName.trim().length > 200) {
    return "Zadajte názov rastliny (najviac 200 znakov).";
  }
  if (!(SLOVAK_REGIONS as readonly string[]).includes(input.region)) return "Vyberte platný kraj.";
  for (const [value, limit] of [[input.condition, 100], [input.size, 100], [input.notes, 5000], [input.district, 200]] as const) {
    if (typeof value !== "string" || value.length > limit) return "Neplatný alebo príliš dlhý popis inzerátu.";
  }
  if (!Array.isArray(input.photoUrls) || input.photoUrls.length < 1 || input.photoUrls.length > 10) {
    return "Pridajte 1 až 10 fotiek.";
  }
  if (input.photoUrls.some((value) => {
    if (typeof value !== "string" || value.length > 2048) return true;
    try {
      const url = new URL(value);
      return url.protocol !== "https:" || Boolean(url.username || url.password);
    } catch { return true; }
  })) return "Fotky obsahujú neplatnú adresu.";

  if (input.type === "fixed") {
    if (!isValidEuroAmount(input.fixedPrice)) return "Zadajte platnú cenu s najviac dvoma desatinnými miestami.";
  } else {
    if (!isValidEuroAmount(input.auctionStartPrice)) return "Zadajte platnú začiatočnú cenu.";
    if (!isValidEuroAmount(input.auctionMinIncrement)) return "Zadajte platný minimálny príhoz.";
    if (typeof input.auctionEndsAt !== "string" || !Number.isFinite(Date.parse(input.auctionEndsAt)) ||
        Date.parse(input.auctionEndsAt) <= now.getTime()) return "Vyberte platný koniec aukcie v budúcnosti.";
  }
  return null;
}
