import { notFound } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListingGrid } from "@/components/profile/listing-grid";
import { ProfileActions } from "@/components/profile/profile-actions";
import {
  getProfileByUserId,
  getActiveListingsBySeller,
  getIsBlocked,
} from "@/lib/data/profile";
import { getReviewableListings } from "@/lib/data/reviews";
import { getUser } from "@/lib/auth";

type ProfilePageProps = {
  params: Promise<{ userId: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { userId } = await params;
  const [profile, listings, currentUser, reviewableListings] = await Promise.all([
    getProfileByUserId(userId),
    getActiveListingsBySeller(userId),
    getUser(),
    getUser().then((u) =>
      u ? getReviewableListings(userId, u.id) : Promise.resolve([])
    ),
  ]);

  if (!profile) {
    notFound();
  }

  const isOwnProfile = currentUser?.id === userId;
  const isAuthenticated = !!currentUser;
  const isBlocked = isAuthenticated
    ? await getIsBlocked(currentUser!.id, userId)
    : false;

  const displayName =
    profile.display_name?.trim() ||
    "Používateľ";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

  const locationParts = [profile.region, profile.district].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : null;

  const ratingLabel =
    profile.ratings_count > 0 && profile.ratings_avg != null
      ? `${Number(profile.ratings_avg).toFixed(1)} (${profile.ratings_count} ${profile.ratings_count === 1 ? "recenzia" : profile.ratings_count < 5 ? "recenzie" : "recenzií"})`
      : "Zatiaľ žiadne hodnotenia";

  return (
    <div className="space-y-6 pb-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <Avatar size="lg" className="size-16 shrink-0 sm:size-20">
              {profile.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={displayName} />
              ) : null}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl">{displayName}</CardTitle>
                {profile.phone_verified && (
                  <Badge variant="secondary" className="shrink-0">
                    Overený telefón
                  </Badge>
                )}
              </div>
              {location ? (
                <p className="text-muted-foreground text-sm">{location}</p>
              ) : null}
              <p className="text-muted-foreground text-sm" aria-label="Hodnotenie">
                {ratingLabel}
              </p>
              <ProfileActions
                profileUserId={profile.id}
                isOwnProfile={isOwnProfile}
                isBlocked={isBlocked}
                isAuthenticated={isAuthenticated}
                reviewableCount={reviewableListings.length}
              />
            </div>
          </div>
        </CardHeader>
        {profile.bio?.trim() ? (
          <CardContent className="border-t pt-4">
            <p className="text-muted-foreground whitespace-pre-wrap text-sm">
              {profile.bio.trim()}
            </p>
          </CardContent>
        ) : null}
      </Card>

      <section aria-labelledby="listings-heading">
        <h2 id="listings-heading" className="mb-3 text-lg font-semibold">
          Aktívne inzeráty
        </h2>
        <ListingGrid listings={listings} />
      </section>
    </div>
  );
}
