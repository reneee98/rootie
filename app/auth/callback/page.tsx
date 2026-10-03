"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { normalizeNextPath } from "@/lib/auth-redirect";

/**
 * The browser client exchanges PKCE codes during initialization. Legacy hash
 * links remain supported, and registration preserves the intended destination.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let active = true;
    const run = async () => {
      const url = new URL(window.location.href);
      const redirectPath = normalizeNextPath(url.searchParams.get("next"));
      const hash = new URLSearchParams(url.hash.slice(1));
      try {
        const supabase = createSupabaseBrowserClient();
        const { error: initializationError } = await supabase.auth.initialize();
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else if (initializationError || url.searchParams.get("error") || hash.get("error")) {
          throw new Error("Invalid confirmation link");
        }

        const { data: { user }, error } = await supabase.auth.getUser();
        if (!active) return;
        window.history.replaceState(null, "", window.location.pathname);
        if (user && !error) {
          setStatus("ok");
          router.replace(redirectPath);
          router.refresh();
          return;
        }
        setStatus("error");
      } catch {
        if (!active) return;
        window.history.replaceState(null, "", window.location.pathname);
        setStatus("error");
      }
    };
    void run();
    return () => { active = false; };
  }, [router]);

  return (
    <div className="bg-background flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="rootie-surface mx-auto w-full max-w-sm px-5 py-8 text-center">
        {status === "loading" && (
          <p className="text-muted-foreground text-sm" role="status">
            Potvrdzujem účet…
          </p>
        )}
        {status === "ok" && (
          <p className="text-muted-foreground text-sm" role="status">
            Účet potvrdený. Presmerovávam…
          </p>
        )}
        {status === "error" && (
          <div className="space-y-3">
            <p className="text-destructive text-sm" role="alert">
              Odkaz sa nepodarilo overiť. Môže byť neplatný alebo už použitý.
            </p>
            <Link href="/login" className="inline-flex min-h-11 items-center font-medium underline">
              Prejsť na prihlásenie
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
