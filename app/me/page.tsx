import Link from "next/link";
import { Shield } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DefaultShippingAddressSection } from "@/components/me/default-shipping-address-section";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getProfileShippingAddress } from "@/lib/data/orders";

export default async function MePage() {
  const user = await requireUser("/me");

  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, defaultShippingAddress] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("is_moderator")
        .eq("id", user.id)
        .single(),
      getProfileShippingAddress(user.id),
    ]);
  const isModerator = Boolean(profile?.is_moderator);

  const displayName =
    (user.user_metadata.full_name as string | undefined) ??
    (user.user_metadata.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Rootie user";

  const initials =
    displayName
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "RU";

  const avatarUrl = user.user_metadata.avatar_url as string | undefined;

  return (
    <div className="space-y-6 pb-6">
      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>Účet</CardTitle>
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm font-semibold">{displayName}</p>
              <p className="text-muted-foreground text-xs">{user.email}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isModerator && (
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link href="/admin/reports">
                <Shield className="size-4" aria-hidden />
                Moderácia – nahlásenia
              </Link>
            </Button>
          )}

          <DefaultShippingAddressSection initialAddress={defaultShippingAddress} />

          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
