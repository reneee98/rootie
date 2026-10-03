import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { RootiePageShell } from "@/components/layout/rootie-page-shell";
import { MyListingsSection } from "@/components/me/my-listings-section";
import { requireUser } from "@/lib/auth";
import { getMyListingBuckets, type MyListingBuckets } from "@/lib/data/me";

function onlyAuctions(buckets: MyListingBuckets): MyListingBuckets {
  return {
    active: buckets.active.filter((item) => item.type === "auction"),
    reserved: buckets.reserved.filter((item) => item.type === "auction"),
    sold: buckets.sold.filter((item) => item.type === "auction"),
    inactive: buckets.inactive.filter((item) => item.type === "auction"),
  };
}

export default async function MeAuctionsPage() {
  const user = await requireUser("/me/auctions");
  const buckets = onlyAuctions(await getMyListingBuckets(user.id));

  return (
    <RootiePageShell
      eyebrow="Profil"
      title="Moje aukcie"
      description="Prehľad vašich aukcií."
      headerClassName="border border-[#e9e2d1] bg-[#faf8f4] shadow-none"
      actions={
        <Link
          href="/me"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e9e2d1] bg-[#f2ede2] text-[#67635c] hover:bg-[#ece6d8] hover:text-[#232711]"
          aria-label="Späť na profil"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
      }
    >
      <MyListingsSection
        buckets={buckets}
        emptyCopy={{
          active: "Nemáte žiadne aktívne aukcie.",
          reserved: "Nemáte žiadne rezervované aukcie.",
          sold: "Nemáte žiadne ukončené aukcie.",
          inactive: "Nemáte žiadne neaktívne aukcie.",
        }}
      />
    </RootiePageShell>
  );
}
