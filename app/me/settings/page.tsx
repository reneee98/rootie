import Link from "next/link";
import { ChevronLeft, Shield } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { RootiePageShell } from "@/components/layout/rootie-page-shell";
import { PhoneVerificationSection } from "@/components/me/phone-verification-section";
import { ProfileInfoSection } from "@/components/me/profile-info-section";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

export default async function MeSettingsPage() {
  const user = await requireUser("/me/settings");
  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, privatePhoneResult] = await Promise.all([
    supabase.from("profiles")
      .select("is_moderator, display_name, bio, show_phone_on_listing, phone_verified")
      .eq("id", user.id)
      .single(),
    supabase.rpc("get_my_profile_phone"),
  ]);
  let privatePhone = privatePhoneResult.data;
  let phoneError = privatePhoneResult.error;
  if (phoneError && ["PGRST202", "42883"].includes(phoneError.code)) {
    // Compatibility for deployments awaiting the privacy RPC migration.
    const ownerPhoneResult = await supabase.from("profiles")
      .select("phone, phone_verified, show_phone_on_listing")
      .eq("id", user.id).single();
    privatePhone = ownerPhoneResult.data;
    phoneError = ownerPhoneResult.error;
  }

  const isModerator = Boolean(profile?.is_moderator);

  return (
    <RootiePageShell
      eyebrow="Profil"
      title="Nastavenia"
      description="Správa verejného profilu, telefónu a bezpečnosti."
      contentClassName="space-y-4"
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
      {isModerator ? (
        <Button asChild variant="outline" className="w-full justify-start gap-2">
          <Link href="/admin/reports">
            <Shield className="size-4" aria-hidden />
            Moderácia – nahlásenia
          </Link>
        </Button>
      ) : null}

      <ProfileInfoSection
        initialDisplayName={(profile?.display_name as string | null) ?? null}
        initialBio={(profile?.bio as string | null) ?? null}
      />

      {phoneError ? (
        <p className="rootie-surface p-4 text-sm text-destructive" role="alert">
          Nastavenia telefónu sa nepodarilo načítať. Skúste to neskôr.
        </p>
      ) : <PhoneVerificationSection
        initialPhone={typeof privatePhone?.phone === "string" ? privatePhone.phone : null}
        initialShowPhoneOnListing={Boolean(profile?.show_phone_on_listing)}
        initialPhoneVerified={Boolean(profile?.phone_verified)}
      />}

      <SignOutButton
        withIcon
        className="rootie-surface h-11 w-full justify-start gap-2 rounded-[14px] border-[#e9e2d1] bg-[#faf8f4] px-[14px] text-[12.25px] font-semibold text-[#1a2e1a] shadow-none hover:bg-[#f1ece1]"
      />
    </RootiePageShell>
  );
}
