"use client";

import Link from "next/link";
import { Leaf, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Soft, non-intrusive auth prompt shown inline in the feed for guests.
 * Explains benefits (save, message, sell) and offers login/signup.
 */
export function AuthPromptBanner() {
  return (
    <section
      aria-label="Prihlásenie"
      className="bg-primary/5 border-primary/15 rounded-xl border p-4"
    >
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
          <Leaf className="text-primary size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm font-semibold leading-tight">
            Vytvorte si účet a obchodujte s rastlinami
          </p>
          <ul className="text-muted-foreground mt-1.5 space-y-1 text-xs">
            <li className="flex items-center gap-1.5">
              <Heart className="size-3.5 shrink-0" aria-hidden />
              Ukladajte si obľúbené inzeráty
            </li>
            <li className="flex items-center gap-1.5">
              <MessageCircle className="size-3.5 shrink-0" aria-hidden />
              Píšte predajcom a dohodnite výmenu
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button asChild size="sm" className="min-h-[40px] flex-1 text-sm">
          <Link href="/signup">Vytvoriť účet</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="min-h-[40px] flex-1 text-sm"
        >
          <Link href="/login">Prihlásiť sa</Link>
        </Button>
      </div>
    </section>
  );
}
