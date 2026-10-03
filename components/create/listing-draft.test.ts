import { describe, expect, it } from "vitest";
import { DEFAULT_DRAFT, getDraftStorageKey, restoreDraft, validateAll, validateStep } from "./listing-draft";
import { SLOVAK_REGIONS } from "@/lib/regions";

describe("restoring an untrusted listing draft", () => {
  it.each([null, [], "invalid", 42])("falls back to a usable draft for %j", (input) => {
    expect(restoreDraft(input, "owner", SLOVAK_REGIONS[0])).toEqual({
      ...DEFAULT_DRAFT, region: SLOVAK_REGIONS[0], photos: [],
    });
  });

  it("ignores wrong field types and invalid enums instead of crashing the wizard", () => {
    const draft = restoreDraft({ plantName: 12, photos: {}, type: "wanted", swapEnabled: "yes", auctionDuration: "forever" }, "owner", "");
    expect(draft).toEqual(DEFAULT_DRAFT);
    expect(validateAll(draft)).toHaveProperty("photos");
    expect(validateAll(draft)).toHaveProperty("plantName");
  });

  it("retains this seller's photos and excludes another account's uploads or unsafe URLs", () => {
    const own = { url: "https://example.com/storage/v1/object/public/listing-photos/owner/photo.jpg", storagePath: "owner/photo.jpg" };
    const draft = restoreDraft({ photos: [
      own,
      { url: "https://example.com/other.jpg", storagePath: "another-user/photo.jpg" },
      { url: "https://example.com/storage/v1/object/public/listing-photos/another-user/photo.jpg", storagePath: "owner/forged.jpg" },
      { url: "javascript:alert(1)", storagePath: "owner/unsafe.jpg" },
      null,
    ] }, "owner", "");
    expect(draft.photos).toEqual([own]);
  });

  it("caps restored photos at the supported maximum", () => {
    const photos = Array.from({ length: 12 }, (_, index) => ({ url: `https://example.com/storage/v1/object/public/listing-photos/owner/${index}.jpg`, storagePath: `owner/${index}.jpg` }));
    expect(restoreDraft({ photos }, "owner", "").photos).toHaveLength(10);
  });

  it("stores each account's draft separately", () => {
    expect(getDraftStorageKey("seller-a")).not.toBe(getDraftStorageKey("seller-b"));
    expect(getDraftStorageKey("seller-a")).toBe("rootie_listing_draft:seller-a");
  });
});

describe("listing wizard validation", () => {
  it.each(["Infinity", "1e4", "12eur", "1.005", "0", "-2"])("rejects an invalid price %s", (fixedPrice) => {
    expect(validateStep(4, { ...DEFAULT_DRAFT, fixedPrice })).toHaveProperty("fixedPrice");
  });

  it("accepts localized prices to the cent", () => {
    expect(validateStep(4, { ...DEFAULT_DRAFT, fixedPrice: "12,35" })).toEqual({});
  });

  it("validates both auction price fields and region before publication", () => {
    const draft = { ...DEFAULT_DRAFT, type: "auction" as const, region: "Invalid region", auctionStartPrice: "1", auctionMinIncrement: "Infinity" };
    expect(validateAll(draft)).toHaveProperty("region");
    expect(validateAll(draft)).toHaveProperty("auctionMinIncrement");
    expect(validateStep(4, { ...draft, auctionMinIncrement: "0.01" })).toEqual({});
  });
});
