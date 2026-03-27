import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
};

export function ListingSellerBlock({ seller }: ListingSellerBlockProps) {
  const name = seller.display_name?.trim() || "Používateľ";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
  const ratingLabel =
    seller.ratings_count > 0 && seller.ratings_avg != null
      ? `${Number(seller.ratings_avg).toFixed(1).replace(".", ",")}`
      : null;

  return (
    <div className="flex h-[72px] items-center gap-2.5 rounded-[14px] bg-[#f1ece1] px-3">
      <Avatar className="size-11 shrink-0 bg-[#e5decc]">
        {seller.avatar_url ? (
          <AvatarImage src={seller.avatar_url} alt={name} />
        ) : null}
        <AvatarFallback className="text-[13px] font-medium text-[#8f9036]">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold leading-[18px] text-[#1a2e1a]">
          {name}
        </p>
        <div className="mt-1 flex items-center gap-1">
          <Star className="size-[10px] fill-[#e0a500] text-[#e0a500]" aria-hidden />
          {ratingLabel ? (
            <>
              <span className="text-[10px] font-bold leading-[12px] text-[#232711]">{ratingLabel}</span>
              <span className="text-[10px] leading-[12px] text-[#c8c2b4]">({seller.ratings_count})</span>
            </>
          ) : (
            <span className="text-[10px] leading-[12px] text-[#c8c2b4]">Nový predajca</span>
          )}
        </div>
      </div>
      <Link
        href={`/profile/${seller.id}`}
        className="inline-flex items-center gap-[2px] text-[12px] font-medium leading-[16px] text-[#4f5826]"
      >
        Profil
        <ArrowRight className="size-[14px]" aria-hidden />
      </Link>
    </div>
  );
}
