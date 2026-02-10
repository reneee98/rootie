import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getWantedDetail } from "@/lib/data/wanted";
import { getUser } from "@/lib/auth";
import { getWantedThreadIdIfExists } from "@/lib/actions/wanted-thread";
import { createWantedThreadWithOffer } from "@/lib/actions/wanted-thread";
import { OfferForm } from "@/components/offers/offer-form";
import { Button } from "@/components/ui/button";

type WantedOfferPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WantedOfferPage({ params }: WantedOfferPageProps) {
  const { id } = await params;
  const [wanted, currentUser] = await Promise.all([
    getWantedDetail(id),
    getUser(),
  ]);

  if (!wanted || wanted.status !== "active") {
    notFound();
  }

  if (!currentUser) {
    redirect(`/login?next=${encodeURIComponent(`/wanted/${id}/offer`)}`);
  }

  if (wanted.user_id === currentUser.id) {
    redirect(`/wanted/${id}`);
  }

  const existingThreadId = await getWantedThreadIdIfExists(id, currentUser.id);
  if (existingThreadId) {
    redirect(`/chat/${existingThreadId}`);
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="Späť">
          <Link href={`/wanted/${id}`}>
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Poslať ponuku</h1>
      </div>
      <p className="text-muted-foreground text-sm">
        Ohľadom: <strong>{wanted.plant_name}</strong>
      </p>

      <OfferForm
        context="wanted"
        contextId={id}
        submitAction={createWantedThreadWithOffer}
        backHref={`/wanted/${id}`}
      />
    </div>
  );
}
