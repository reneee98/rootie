import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { RootiePageShell } from "@/components/layout/rootie-page-shell";
import { DefaultShippingAddressSection } from "@/components/me/default-shipping-address-section";
import { requireUser } from "@/lib/auth";
import { getProfileShippingAddress } from "@/lib/data/orders";

export default async function MeShippingPage() {
  const user = await requireUser("/me/shipping");
  const defaultShippingAddress = await getProfileShippingAddress(user.id);

  return (
    <RootiePageShell
      eyebrow="Profil"
      title="Doručovacia adresa"
      description="Predvolená adresa sa predvyplní v chate pri odoslaní."
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
      <DefaultShippingAddressSection initialAddress={defaultShippingAddress} />
    </RootiePageShell>
  );
}
