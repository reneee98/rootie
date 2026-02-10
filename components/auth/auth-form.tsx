"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
  nextPath?: string;
};

function normalizeNextPath(nextPath?: string) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/me";
  }

  return nextPath;
}

export function AuthForm({ mode, nextPath }: AuthFormProps) {
  const router = useRouter();
  const redirectPath = useMemo(() => normalizeNextPath(nextPath), [nextPath]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLogin = mode === "login";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();

    if (isLogin) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsSubmitting(false);
        return;
      }

      router.replace(redirectPath);
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
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

    setMessage("Account created. Check your email to confirm your address.");
    setIsSubmitting(false);
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>{isLogin ? "Log in" : "Sign up"}</CardTitle>
        <p className="text-muted-foreground text-sm">
          {isLogin
            ? "Use your email and password to continue."
            : "Create an account with your email and password."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />

          {error ? (
            <p className="text-destructive inline-flex items-center gap-2 text-sm">
              <AlertCircle className="size-4" />
              {error}
            </p>
          ) : null}

          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isLogin
                ? "Logging in..."
                : "Creating account..."
              : isLogin
                ? "Log in"
                : "Create account"}
          </Button>
        </form>

        <p className="text-muted-foreground text-sm">
          {isLogin ? "Need an account?" : "Already have an account?"}{" "}
          <Link
            className="text-foreground font-medium underline underline-offset-2"
            href={isLogin ? `/signup?next=${encodeURIComponent(redirectPath)}` : `/login?next=${encodeURIComponent(redirectPath)}`}
          >
            {isLogin ? "Sign up" : "Log in"}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
