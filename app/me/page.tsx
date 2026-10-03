import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  Heart,
  Box,
  Gavel,
  Truck,
  Settings,
  CircleHelp,
  Star,
  Shield,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { requireUser } from "@/lib/auth";
import { getMyListingBuckets } from "@/lib/data/me";
import { getProfileShippingAddress } from "@/lib/data/orders";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

type QuickLinkRowProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  iconClassName?: string;
};

function getSlovakCountLabel(
  count: number,
  one: string,
  few: string,
  many: string
): string {
  if (count === 1) return `${count} ${one}`;
  if (count >= 2 && count <= 4) return `${count} ${few}`;
  return `${count} ${many}`;
}

function QuickLinkRow({
  href,
  icon: Icon,
  title,
  subtitle,
  iconClassName,
}: QuickLinkRowProps) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-4 transition-colors hover:bg-[#f3efe6] ${
        subtitle ? "min-h-16 py-2.5" : "min-h-[43px] py-1.5"
      }`}
    >
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f2ede2]">
        <Icon className={`size-4 shrink-0 ${iconClassName ?? "text-[#5a6e5a]"}`} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.25px] font-semibold leading-[17.5px] text-[#1a2e1a]">{title}</p>
        {subtitle ? (
          <p className="truncate text-[11px] font-semibold leading-[16.5px] text-[#5a6e5a]">{subtitle}</p>
        ) : null}
      </div>
      <ChevronRight className="size-4 shrink-0 text-[#7f8f7f] transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[14px] border border-[#e9e2d1] bg-[#f5f1e8] px-2.5 py-2.5 text-center">
      <p className="text-[16px] font-bold leading-[24px] text-[#1a2e1a]">{value}</p>
      <p className="text-[11px] leading-[16px] text-[#5a6e5a]">{label}</p>
    </div>
  );
}

export default async function MePage() {
  const user = await requireUser("/me");
  const supabase = await createSupabaseServerClient();

  const [{ data: profile }, defaultShippingAddress, listingBuckets, savedCountRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("is_moderator, display_name, ratings_count, sold_count")
        .eq("id", user.id)
        .single(),
      getProfileShippingAddress(user.id),
      getMyListingBuckets(user.id),
      supabase
        .from("saved_listings")
        .select("listing_id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  const isModerator = Boolean(profile?.is_moderator);
  const displayName =
    (profile?.display_name as string | null)?.trim() ||
    (user.user_metadata.full_name as string | undefined)?.trim() ||
    (user.user_metadata.name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Rootie user";
  const initials =
    displayName
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "RU";
  const avatarUrl = user.user_metadata.avatar_url as string | undefined;

  const favoritesCount = savedCountRes.count ?? 0;
  const activeListingsCount = listingBuckets.active.length;
  const activeAuctionsCount = listingBuckets.active.filter((item) => item.type === "auction").length;
  const soldCount = listingBuckets.sold.length;
  const ratingsCount = Number(profile?.ratings_count ?? 0);
  const shippingSubtitle = defaultShippingAddress ? "Nastavená" : "Nenastavená";

  return (
    <div className="rootie-page space-y-4">
      <section className="rootie-surface rounded-[18px] border-[#e9e2d1] bg-[linear-gradient(180deg,#faf8f4_0%,#f5f1e8_100%)] p-4 shadow-none">
        <h1 className="text-[14px] font-bold leading-[21px] text-[#1a2e1a]">Účet</h1>

        <div className="mt-[14px] flex items-center gap-[10px]">
          <Avatar className="size-[42px] bg-[#f0f4f0]">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="text-[16px] font-bold text-[#5a6e5a]">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold leading-[21px] text-[#1a2e1a]">
              {displayName}
            </p>
            <p className="truncate text-[12.25px] leading-[17.5px] text-[#5a6e5a]">
              {user.email}
            </p>
          </div>

          <div className="inline-flex items-center gap-1 text-[#1a2e1a]">
            <Star className="size-[14px] fill-[#e0a500] text-[#e0a500]" aria-hidden />
            <span className="text-[12px] font-bold leading-[17px]">{ratingsCount}</span>
          </div>
        </div>

        <div className="mt-[14px] grid grid-cols-3 gap-[7px]">
          <StatTile value={String(activeListingsCount)} label="Inzeráty" />
          <StatTile value={String(soldCount)} label="Predaje" />
          <StatTile value={String(ratingsCount)} label="Hodnotenia" />
        </div>
      </section>

      <section className="rootie-surface overflow-hidden rounded-[18px] border-[#e9e2d1] shadow-none">
        <div className="divide-y divide-[rgba(45,122,77,0.06)]">
          <QuickLinkRow
            href="/saved"
            icon={Heart}
            title="Moje obľúbené"
            subtitle={getSlovakCountLabel(favoritesCount, "rastlina", "rastliny", "rastlín")}
            iconClassName="text-[#f45757]"
          />
          <QuickLinkRow
            href="/me/listings"
            icon={Box}
            title="Moje inzeráty"
            subtitle={getSlovakCountLabel(activeListingsCount, "aktívny", "aktívne", "aktívnych")}
            iconClassName="text-[#2d7a4d]"
          />
          <QuickLinkRow
            href="/me/auctions"
            icon={Gavel}
            title="Moje aukcie"
            subtitle={getSlovakCountLabel(activeAuctionsCount, "aktívna", "aktívne", "aktívnych")}
            iconClassName="text-[#ff7f4f]"
          />
          <QuickLinkRow
            href="/me/shipping"
            icon={Truck}
            title="Doručovacia adresa"
            subtitle={shippingSubtitle}
            iconClassName="text-[#2d7a4d]"
          />
          <QuickLinkRow href="/me/settings" icon={Settings} title="Nastavenia" />
          {isModerator ? (
            <QuickLinkRow
              href="/admin/reports"
              icon={Shield}
              title="Moderácia"
              subtitle="Nahlásenia používateľov"
            />
          ) : null}
          <QuickLinkRow href="/me/help" icon={CircleHelp} title="Pomoc a podpora" />
        </div>
      </section>

      <SignOutButton
        withIcon
        className="rootie-surface h-11 w-full justify-start gap-2 rounded-[14px] border-[#e9e2d1] bg-[#faf8f4] px-[14px] text-[12.25px] font-semibold text-[#1a2e1a] shadow-none hover:bg-[#f1ece1]"
      />
    </div>
  );
}
