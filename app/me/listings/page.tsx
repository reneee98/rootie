import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { RootiePageShell } from "@/components/layout/rootie-page-shell";
import { MyListingsSection } from "@/components/me/my-listings-section";
import { requireUser } from "@/lib/auth";
import { getMyListingBuckets } from "@/lib/data/me";

export default async function MeListingsPage() {
  const user = await requireUser("/me/listings");
  const buckets = await getMyListingBuckets(user.id);

  return (
    <RootiePageShell
      eyebrow="Profil"
      title="Moje inzeráty"
      description="Spravujte svoje ponuky podľa stavu."
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
      <MyListingsSection buckets={buckets} />
    </RootiePageShell>
  );
}
