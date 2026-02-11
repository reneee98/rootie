"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ListingGrid } from "@/components/profile/listing-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { MyListingBuckets, MyPurchaseBuckets } from "@/lib/data/me";
import { formatDateTime, formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type MojeSectionsProps = {
  listingBuckets: MyListingBuckets;
  purchaseBuckets: MyPurchaseBuckets;
};

type SellerTab = "active" | "reserved" | "sold" | "inactive";
type BuyerTab = "in_progress" | "delivered" | "cancelled";

function getPurchaseStatusLabel(status: string) {
  if (status === "shipped") return "Odoslané";
  if (status === "delivered") return "Doručené";
  if (status === "price_accepted" || status === "address_provided") {
    return "Rezervované";
  }
  if (status === "cancelled") return "Ponuka";
  return "Ponuka";
}

function getPurchaseStatusClass(status: string) {
  if (status === "shipped") return "bg-blue-100 text-blue-700";
  if (status === "delivered") return "bg-emerald-100 text-emerald-700";
  if (status === "price_accepted" || status === "address_provided") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-muted text-muted-foreground";
}

export function MojeSections({
  listingBuckets,
  purchaseBuckets,
}: MojeSectionsProps) {
  const [sellerTab, setSellerTab] = useState<SellerTab>("active");
  const [buyerTab, setBuyerTab] = useState<BuyerTab>("in_progress");

  const sellerOptions = useMemo(
    () => [
      { value: "active" as const, label: `Aktívne (${listingBuckets.active.length})` },
      { value: "reserved" as const, label: `Rezervované (${listingBuckets.reserved.length})` },
      { value: "sold" as const, label: `Vyriešené (${listingBuckets.sold.length})` },
      { value: "inactive" as const, label: `Neaktívne (${listingBuckets.inactive.length})` },
    ],
    [listingBuckets]
  );

  const buyerOptions = useMemo(
    () => [
      { value: "in_progress" as const, label: `Prebieha (${purchaseBuckets.in_progress.length})` },
      { value: "delivered" as const, label: `Doručené (${purchaseBuckets.delivered.length})` },
      { value: "cancelled" as const, label: `Zrušené (${purchaseBuckets.cancelled.length})` },
    ],
    [purchaseBuckets]
  );

  const sellerListings = listingBuckets[sellerTab];
  const sellerEmptyText =
    sellerTab === "active"
      ? "Zatiaľ nemáte aktívne inzeráty."
      : sellerTab === "reserved"
        ? "Zatiaľ nemáte rezervované inzeráty."
        : sellerTab === "sold"
          ? "Zatiaľ nemáte vyriešené inzeráty."
          : "Zatiaľ nemáte neaktívne inzeráty.";

  const purchases = purchaseBuckets[buyerTab];
  const purchasesEmptyText =
    buyerTab === "in_progress"
      ? "Zatiaľ nemáte nákupy v stave prebieha."
      : buyerTab === "delivered"
        ? "Zatiaľ nemáte doručené nákupy."
        : "Zatiaľ nemáte zrušené nákupy.";

  return (
    <section className="space-y-6" aria-label="Moje">
      <Card>
        <CardHeader>
          <CardTitle>Moje ponuky</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SegmentedControl
            options={sellerOptions}
            value={sellerTab}
            onValueChange={setSellerTab}
            ariaLabel="Moje ponuky"
          />
          <ListingGrid listings={sellerListings} emptyText={sellerEmptyText} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Moje nákupy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SegmentedControl
            options={buyerOptions}
            value={buyerTab}
            onValueChange={setBuyerTab}
            ariaLabel="Moje nákupy"
          />

          {purchases.length === 0 ? (
            <p className="text-muted-foreground text-sm">{purchasesEmptyText}</p>
          ) : (
            <ul className="space-y-2" role="list">
              {purchases.map((purchase) => {
                const priceLabel =
                  purchase.accepted_price_eur != null &&
                  purchase.accepted_price_eur > 0.01
                    ? formatPrice(purchase.accepted_price_eur)
                    : null;
                return (
                  <li key={purchase.id}>
                    <Link
                      href={`/chat/${purchase.thread_id}`}
                      className="focus-visible:ring-ring flex items-center gap-3 rounded-lg border bg-card p-3 outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2"
                    >
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                        {purchase.listing_photo_url ? (
                          <img
                            src={purchase.listing_photo_url}
                            alt=""
                            className="absolute inset-0 size-full object-cover object-center"
                          />
                        ) : (
                          <span className="text-muted-foreground flex size-full items-center justify-center text-[10px]">
                            Bez fotky
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate text-sm font-semibold">
                          {purchase.listing_name}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          Predávajúci: {purchase.seller_display_name?.trim() || "Používateľ"}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {formatDateTime(purchase.updated_at)}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                            getPurchaseStatusClass(purchase.order_status)
                          )}
                        >
                          {getPurchaseStatusLabel(purchase.order_status)}
                        </span>
                        {priceLabel ? (
                          <p className="mt-1 text-xs font-medium">{priceLabel}</p>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
