import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getListingDetail } from "@/lib/data/listings";
import { getUser } from "@/lib/auth";
import { getListingThreadIdIfExists } from "@/lib/actions/listing-thread";
import { createListingThreadWithOffer } from "@/lib/actions/listing-thread";
import { OfferForm } from "@/components/offers/offer-form";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

type ListingOfferPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ListingOfferPage({
  params,
}: ListingOfferPageProps) {
  const { id } = await params;
  const currentUser = await getUser();
  const listing = await getListingDetail(id, currentUser?.id ?? undefined);

  if (!listing || listing.status !== "active") {
    notFound();
  }

  if (!currentUser) {
    redirect(`/login?next=${encodeURIComponent(`/listing/${id}/offer`)}`);
  }

  if (listing.seller_id === currentUser.id) {
    redirect(`/listing/${id}`);
  }

  if (listing.type === "auction") {
    redirect(`/listing/${id}`);
  }

  const existingThreadId = await getListingThreadIdIfExists(id, currentUser.id);
  if (existingThreadId) {
    const supabase = await createSupabaseServerClient();
    const { data: existingOffers } = await supabase
      .from("messages")
      .select("id")
      .eq("thread_id", existingThreadId)
      .eq("sender_id", currentUser.id)
      .in("message_type", ["offer_price", "offer_swap"])
      .limit(1);

    if (existingOffers?.length) {
      redirect(`/chat/${existingThreadId}`);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="Späť">
          <Link href={`/listing/${id}`}>
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Reagovať na ponuku</h1>
      </div>
      <p className="text-muted-foreground text-sm">
        Ohľadom: <strong>{listing.plant_name}</strong>
      </p>

      <OfferForm
        context="listing"
        contextId={id}
        submitAction={createListingThreadWithOffer}
        backHref={`/listing/${id}`}
      />
    </div>
  );
}
