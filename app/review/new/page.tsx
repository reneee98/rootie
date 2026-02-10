import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getReviewEligibility } from "@/lib/data/reviews";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { SubmitReviewForm } from "@/components/review/submit-review-form";
import { Button } from "@/components/ui/button";

type ReviewNewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReviewNewPage({ searchParams }: ReviewNewPageProps) {
  const user = await requireUser("/review/new");
  const params = await searchParams;
  const threadId = typeof params.threadId === "string" ? params.threadId : null;
  const listingId = typeof params.listingId === "string" ? params.listingId : null;
  const sellerId = typeof params.sellerId === "string" ? params.sellerId : null;

  if (!threadId || !listingId || !sellerId) {
    notFound();
  }

  const eligibility = await getReviewEligibility(
    threadId,
    listingId,
    user.id,
    sellerId
  );

  if (!eligibility.eligible) {
    return (
      <div className="space-y-4 py-6">
        <h1 className="text-lg font-semibold">Napísať recenziu</h1>
        <p className="text-muted-foreground text-sm">
          {eligibility.reason ?? "Nemôžete hodnotiť tohto predajcu za tento inzerát."}
        </p>
        <Button asChild variant="outline">
          <Link href="/inbox">Späť do správ</Link>
        </Button>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("plant_name")
    .eq("id", listingId)
    .single();
  const { data: seller } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", sellerId)
    .single();

  const listingTitle = listing?.plant_name ?? "Inzerát";
  const sellerName = seller?.display_name?.trim() ?? "Predajca";

  return (
    <div className="space-y-4 py-6">
      <h1 className="text-lg font-semibold">Napísať recenziu</h1>
      <p className="text-muted-foreground text-sm">
        Hodnotíte predajcu <strong>{sellerName}</strong> za inzerát „{listingTitle}”.
      </p>
      <SubmitReviewForm
        sellerId={sellerId}
        listingId={listingId}
        threadId={threadId}
      />
    </div>
  );
}
