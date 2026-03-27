import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getReviewableListings } from "@/lib/data/reviews";
import { getProfileByUserId } from "@/lib/data/profile";
import { Button } from "@/components/ui/button";
import { RootiePageShell } from "@/components/layout/rootie-page-shell";

type ReviewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const user = await requireUser("/review");
  const params = await searchParams;
  const sellerId = typeof params.sellerId === "string" ? params.sellerId : null;

  if (!sellerId) {
    notFound();
  }

  const [reviewable, profile] = await Promise.all([
    getReviewableListings(sellerId, user.id),
    getProfileByUserId(sellerId),
  ]);

  if (!profile) notFound();

  const sellerName = profile.display_name?.trim() ?? "Predajca";

  if (reviewable.length === 0) {
    return (
      <RootiePageShell
        eyebrow="Hodnotenie"
        title="Napísať recenziu"
        description={`Recenzie sa dajú pridávať po doručení objednávky od používateľa ${sellerName}.`}
      >
        <div className="rootie-surface space-y-3 p-4">
          <p className="text-muted-foreground text-sm">
            Nemáte žiadny inzerát tohto predajcu ({sellerName}), za ktorý by ste mohli napísať recenziu. Recenziu môžete napísať až po potvrdení stavu objednávky „Doručené“.
          </p>
          <Button asChild variant="outline">
            <Link href={`/profile/${sellerId}`}>Späť na profil</Link>
          </Button>
        </div>
      </RootiePageShell>
    );
  }

  return (
    <RootiePageShell
      eyebrow="Hodnotenie"
      title={`Napísať recenziu pre ${sellerName}`}
      description="Vyberte inzerát, ktorý chcete ohodnotiť."
    >
      <ul className="flex flex-col gap-2" role="list">
        {reviewable.map((r) => (
          <li key={r.listingId}>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link
                href={`/review/new?threadId=${r.threadId}&listingId=${r.listingId}&sellerId=${sellerId}`}
              >
                {r.listingTitle}
              </Link>
            </Button>
          </li>
        ))}
      </ul>
      <Button asChild variant="ghost" size="sm">
        <Link href={`/profile/${sellerId}`}>Späť na profil</Link>
      </Button>
    </RootiePageShell>
  );
}
