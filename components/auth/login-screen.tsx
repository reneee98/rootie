"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthScreenLayout } from "@/components/auth/auth-screen-layout";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeNextPath(nextPath?: string) {
  if (!nextPath || !nextPath.startsWith("/")) return "/";
  return nextPath;
}

type LoginScreenProps = {
  nextPath?: string;
};

export function LoginScreen({ nextPath }: LoginScreenProps) {
  const router = useRouter();
  const redirectPath = useMemo(() => normalizeNextPath(nextPath), [nextPath]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailTrimmed = email.trim();
  const emailValid = EMAIL_RE.test(emailTrimmed);
  const emailTouched = email.length > 0;
  const emailError = emailTouched && !emailTrimmed ? "Zadajte e-mail." : emailTouched && !emailValid ? "Neplatný formát e-mailu." : null;

  const passwordError = password.length > 0 && password.length < 6 ? "Heslo musí mať aspoň 6 znakov." : null;

  const canSubmit = emailValid && password.length >= 6 && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailTrimmed.toLowerCase(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    router.replace(redirectPath);
    router.refresh();
  };

  return (
    <AuthScreenLayout>
      <div className="flex flex-1 flex-col">
        <div className="flex min-h-[44px] items-center">
          <Button variant="ghost" size="icon" asChild aria-label="Späť">
            <Link href={`/welcome`}>
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 flex-1">
          <h1 className="rootie-h1 text-2xl">Prihlásiť sa</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Zadajte e-mail a heslo.
          </p>

          <form id="login-form" onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium">
                E-mail
              </label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="vas@email.sk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "login-email-error" : undefined}
              />
              {emailError && (
                <p id="login-email-error" className="text-destructive text-sm" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-medium">
                  Heslo
                </label>
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
                >
                  Zabudli ste heslo?
                </Link>
              </div>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-base"
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? "login-password-error" : undefined}
              />
              {passwordError && (
                <p id="login-password-error" className="text-destructive text-sm" role="alert">
                  {passwordError}
                </p>
              )}
            </div>

            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
          </form>

          <p className="text-muted-foreground mt-6 text-center text-sm">
            Nemáte účet?{" "}
            <Link
              href={`/signup?next=${encodeURIComponent(redirectPath)}`}
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Vytvoriť účet
            </Link>
          </p>
        </div>
      </div>

      <div className="border-t bg-background pt-4 pb-2">
        <Button
          type="submit"
          form="login-form"
          size="lg"
          className="min-h-[48px] w-full text-base"
          disabled={!canSubmit}
        >
          {isSubmitting ? "Prihlasujem…" : "Prihlásiť sa"}
        </Button>
      </div>
    </AuthScreenLayout>
  );
}
