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

type SignupScreenProps = {
  nextPath?: string;
};

export function SignupScreen({ nextPath }: SignupScreenProps) {
  const router = useRouter();
  const redirectPath = useMemo(() => normalizeNextPath(nextPath), [nextPath]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameTrimmed = name.trim();
  const nameValid = nameTrimmed.length >= 2;
  const nameTouched = name.length > 0;
  const nameError = nameTouched && !nameTrimmed ? "Zadajte meno." : nameTouched && !nameValid ? "Meno musí mať aspoň 2 znaky." : null;

  const emailTrimmed = email.trim();
  const emailValid = EMAIL_RE.test(emailTrimmed);
  const emailTouched = email.length > 0;
  const emailError = emailTouched && !emailTrimmed ? "Zadajte e-mail." : emailTouched && !emailValid ? "Neplatný formát e-mailu." : null;

  const passwordError = password.length > 0 && password.length < 6 ? "Heslo musí mať aspoň 6 znakov." : null;

  const canSubmit = nameValid && emailValid && password.length >= 6 && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const appOrigin =
      typeof window !== "undefined"
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL ?? "");
    const emailRedirectTo = appOrigin ? `${appOrigin}/auth/callback` : undefined;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: emailTrimmed.toLowerCase(),
      password,
      options: {
        data: { full_name: nameTrimmed },
        ...(emailRedirectTo && { emailRedirectTo }),
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      router.replace(redirectPath);
      router.refresh();
      return;
    }

    setMessage("Účet bol vytvorený. Skontrolujte e-mail pre potvrdenie.");
    setIsSubmitting(false);
  };

  return (
    <AuthScreenLayout>
      <div className="flex flex-1 flex-col">
        <div className="flex min-h-[44px] items-center">
          <Button variant="ghost" size="icon" asChild aria-label="Späť">
            <Link href="/" aria-label="Späť na domov">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 flex-1">
          <h1 className="rootie-h1 text-2xl">Vytvoriť účet</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Vyplňte údaje pre registráciu.
          </p>

          <form id="signup-form" onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label htmlFor="signup-name" className="text-sm font-medium">
                Meno
              </label>
              <Input
                id="signup-name"
                type="text"
                autoComplete="name"
                placeholder="Vaše meno"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 text-base"
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "signup-name-error" : undefined}
              />
              {nameError && (
                <p id="signup-name-error" className="text-destructive text-sm" role="alert">
                  {nameError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-email" className="text-sm font-medium">
                E-mail
              </label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="vas@email.sk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "signup-email-error" : undefined}
              />
              {emailError && (
                <p id="signup-email-error" className="text-destructive text-sm" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-password" className="text-sm font-medium">
                Heslo
              </label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 6 znakov"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-base"
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? "signup-password-error" : undefined}
              />
              {passwordError && (
                <p id="signup-password-error" className="text-destructive text-sm" role="alert">
                  {passwordError}
                </p>
              )}
            </div>

            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="text-primary text-sm" role="status">
                {message}
              </p>
            )}
          </form>

          <p className="text-muted-foreground mt-6 text-center text-sm">
            Už máte účet?{" "}
            <Link
              href={`/login?next=${encodeURIComponent(redirectPath)}`}
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Prihlásiť sa
            </Link>
          </p>
        </div>
      </div>

      <div className="border-t bg-background pt-4 pb-2">
        <Button
          type="submit"
          form="signup-form"
          size="lg"
          className="min-h-[48px] w-full text-base"
          disabled={!canSubmit}
        >
          {isSubmitting ? "Vytváram účet…" : "Vytvoriť účet"}
        </Button>
      </div>
    </AuthScreenLayout>
  );
}
