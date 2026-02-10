import { Heart } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { getSavedListings } from "@/lib/data/listings";
import { FeedListingCardComponent } from "@/components/feed/feed-listing-card";
import { SavedListingsFilters } from "@/components/saved/saved-listings-filters";

type SavedPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SavedPage({ searchParams }: SavedPageProps) {
  const user = await requireUser("/saved");
  const raw = await searchParams;
  const region =
    typeof raw.region === "string" && raw.region
      ? raw.region
      : "All Slovakia";

  const listings = await getSavedListings(user.id, region);

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-lg font-semibold">
        <Heart className="size-5 shrink-0 fill-current text-primary" aria-hidden />
        Uložené inzeráty
      </h1>

      <SavedListingsFilters currentRegion={region} />

      {listings.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-muted-foreground text-sm">
            Nemáte uložené žiadne inzeráty.
          </p>
          <p className="text-muted-foreground text-xs">
            Kliknite na srdce pri inzeráte a objavia sa tu.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3" role="list">
          {listings.map((listing) => (
            <FeedListingCardComponent
              key={listing.id}
              listing={listing}
              isAuthenticated
            />
          ))}
        </div>
      )}
    </div>
  );
}
