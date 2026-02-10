"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Star, Flag } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ReportListingDialog } from "@/components/listing/report-listing-dialog";
import { cn } from "@/lib/utils";

type Seller = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone_verified: boolean;
  ratings_avg: number | null;
  ratings_count: number;
  region: string | null;
};

type ListingSellerBlockProps = {
  seller: Seller;
  listingId: string;
  isOwnListing: boolean;
  isAuthenticated: boolean;
};

export function ListingSellerBlock({
  seller,
  listingId,
  isOwnListing,
  isAuthenticated,
}: ListingSellerBlockProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const name = seller.display_name?.trim() || "Používateľ";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
  const ratingLabel =
    seller.ratings_count > 0 && seller.ratings_avg != null
      ? `${Number(seller.ratings_avg).toFixed(1)}`
      : null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <Avatar className="size-12 shrink-0">
          {seller.avatar_url ? (
            <AvatarImage src={seller.avatar_url} alt={name} />
          ) : null}
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{name}</span>
            {seller.phone_verified && (
              <ShieldCheck
                className="text-primary size-4 shrink-0"
                aria-label="Overený telefón"
              />
            )}
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            {ratingLabel && (
              <span className="inline-flex items-center gap-0.5">
                <Star className="size-3.5 fill-current" aria-hidden />
                {ratingLabel}
                <span className="text-muted-foreground/80">
                  ({seller.ratings_count})
                </span>
              </span>
            )}
            {seller.region && <span>{seller.region}</span>}
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" className="min-h-11 flex-1" asChild>
          <Link href={`/profile/${seller.id}`}>Profil</Link>
        </Button>
        {!isOwnListing && isAuthenticated && (
          <>
            <ReportListingDialog
              listingId={listingId}
              open={reportOpen}
              onOpenChange={setReportOpen}
            />
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 shrink-0"
              onClick={() => setReportOpen(true)}
              aria-label="Nahlásiť inzerát"
            >
              <Flag className="size-4" aria-hidden />
              Nahlásiť
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
