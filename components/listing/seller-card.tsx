import Link from "next/link";
import { ShieldCheck, Star } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type SellerCardProps = {
  seller: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    phone_verified: boolean;
    ratings_avg: number | null;
    ratings_count: number;
    region: string | null;
  };
};

export function SellerCard({ seller }: SellerCardProps) {
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
    <Link
      href={`/profile/${seller.id}`}
      className="focus-visible:ring-ring flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent outline-none focus-visible:ring-2"
      aria-label={`Profil predajcu ${name}`}
    >
      <Avatar size="lg">
        {seller.avatar_url ? (
          <AvatarImage src={seller.avatar_url} alt={name} />
        ) : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{name}</span>
          {seller.phone_verified && (
            <ShieldCheck className="text-primary size-4 shrink-0" aria-label="Overený" />
          )}
        </div>

        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          {ratingLabel && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="size-3 fill-current" aria-hidden />
              {ratingLabel}
              <span className="text-muted-foreground/70">
                ({seller.ratings_count})
              </span>
            </span>
          )}
          {seller.region && <span>{seller.region}</span>}
        </div>
      </div>

      <Badge variant="outline" className="shrink-0 text-xs">
        Profil
      </Badge>
    </Link>
  );
}
