import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getReviewEligibility } from "@/lib/data/reviews";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { SubmitReviewForm } from "@/components/review/submit-review-form";
import { Button } from "@/components/ui/button";
import { RootiePageShell } from "@/components/layout/rootie-page-shell";

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
      <RootiePageShell
        eyebrow="Hodnotenie"
        title="Napísať recenziu"
        description="Recenziu je možné pridať iba pre oprávnené konverzácie."
      >
        <div className="rootie-surface space-y-3 p-4">
          <p className="text-muted-foreground text-sm">
            {eligibility.reason ?? "Nemôžete hodnotiť tohto predajcu za tento inzerát."}
          </p>
          <Button asChild variant="outline">
            <Link href="/inbox">Späť do správ</Link>
          </Button>
        </div>
      </RootiePageShell>
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
    <RootiePageShell
      eyebrow="Hodnotenie"
      title="Napísať recenziu"
      description={
        <>
          Hodnotíte predajcu <strong>{sellerName}</strong> za inzerát „{listingTitle}”.
        </>
      }
    >
      <SubmitReviewForm
        sellerId={sellerId}
        listingId={listingId}
        threadId={threadId}
      />
    </RootiePageShell>
  );
}
