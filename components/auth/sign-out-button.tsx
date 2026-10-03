"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
  withIcon?: boolean;
};

export function SignOutButton({
  className,
  withIcon = false,
}: SignOutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) {
        setError("Odhlásenie sa nepodarilo. Skúste to znova.");
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Odhlásenie sa nepodarilo. Skúste to znova.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
      variant="outline"
      onClick={handleSignOut}
      disabled={isLoading}
      className={cn(className)}
    >
      {withIcon ? <LogOut className="size-4" aria-hidden /> : null}
      {isLoading ? "Odhlasovanie..." : "Odhlásiť sa"}
      </Button>
      {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
    </>
  );
}
