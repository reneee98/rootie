"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { SegmentedControl } from "@/components/ui/segmented-control";
import type { MyListingBuckets, MyListingCard } from "@/lib/data/me";
import { formatPrice } from "@/lib/formatters";

type ListingTab = "active" | "reserved" | "sold" | "inactive";

type MyListingsSectionProps = {
  buckets: MyListingBuckets;
  emptyCopy?: Partial<Record<ListingTab, string>>;
};

function formatListingPrice(item: MyListingCard): string {
  if (item.type === "fixed") {
    return item.fixed_price != null ? formatPrice(item.fixed_price) : "Dohodou";
  }
  return item.auction_start_price != null ? `Od ${formatPrice(item.auction_start_price)}` : "Aukcia";
}

export function MyListingsSection({
  buckets,
  emptyCopy,
}: MyListingsSectionProps) {
  const [tab, setTab] = useState<ListingTab>("active");

  const options = useMemo(
    () => [
      { value: "active" as const, label: `Aktívne (${buckets.active.length})` },
      { value: "reserved" as const, label: `Rezervované (${buckets.reserved.length})` },
      { value: "sold" as const, label: `Predané (${buckets.sold.length})` },
      { value: "inactive" as const, label: `Neaktívne (${buckets.inactive.length})` },
    ],
    [buckets]
  );

  const items = buckets[tab];
  const defaultEmptyCopy: Record<ListingTab, string> = {
    active: "Zatiaľ nemáte žiadne aktívne inzeráty.",
    reserved: "Zatiaľ nemáte žiadne rezervované inzeráty.",
    sold: "Zatiaľ nemáte žiadne predané inzeráty.",
    inactive: "Zatiaľ nemáte žiadne neaktívne inzeráty.",
  };
  const currentEmptyCopy = emptyCopy?.[tab] ?? defaultEmptyCopy[tab];

  return (
    <section className="space-y-3">
      <SegmentedControl<ListingTab>
        options={options}
        value={tab}
        onValueChange={setTab}
        ariaLabel="Stav mojich inzerátov"
      />

      {items.length === 0 ? (
        <div className="rootie-surface rounded-[18px] border-[#e9e2d1] px-5 py-14 text-center shadow-none">
          <p className="text-[14px] text-[#67635c]">{currentEmptyCopy}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/listing/${item.id}`}
              className="rootie-surface focus-visible:ring-ring flex flex-col overflow-hidden rounded-[16px] border-[#e9e2d1] outline-none transition-all hover:-translate-y-0.5 hover:border-[#ddd4bd] hover:shadow-[0_3px_10px_rgba(0,0,0,0.05)] focus-visible:ring-2"
            >
              <div className="relative aspect-square w-full bg-muted">
                {item.first_photo_url ? (
                  <Image
                    fill
                    src={item.first_photo_url}
                    alt=""
                    className="object-cover object-center"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-xs text-[#878379]">
                    Bez fotky
                  </span>
                )}
              </div>
              <div className="space-y-0.5 p-2.5">
                <p className="truncate text-[13px] font-semibold leading-[16px] text-[#232711]">
                  {item.plant_name}
                </p>
                <p className="text-[12px] leading-[15px] text-[#67635c]">
                  {formatListingPrice(item)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
