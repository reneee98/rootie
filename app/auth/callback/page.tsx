"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

function getParamsFromHash(hash: string): { access_token?: string; refresh_token?: string } {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return {
    access_token: params.get("access_token") ?? undefined,
    refresh_token: params.get("refresh_token") ?? undefined,
  };
}

/**
 * Auth callback: Supabase po potvrdení e-mailu presmeruje sem s tokenmi v URL hash.
 * Parsujeme hash, zavoláme setSession a presmerujeme na domov.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    const run = async () => {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const { access_token, refresh_token } = getParamsFromHash(hash);

      if (access_token) {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token: refresh_token ?? "",
        });
        if (!error) {
          setStatus("ok");
          window.history.replaceState(null, "", window.location.pathname);
          router.replace("/");
          router.refresh();
          return;
        }
      }

      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus("ok");
        router.replace("/");
        router.refresh();
        return;
      }

      setStatus("error");
      router.replace("/login");
      router.refresh();
    };
    run();
  }, [router]);

  return (
    <div className="bg-background flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="mx-auto w-full max-w-sm text-center">
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
          <p className="text-muted-foreground text-sm" role="status">
            Presmerovávam na prihlásenie…
          </p>
        )}
      </div>
    </div>
  );
}
