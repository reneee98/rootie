"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ChatThreadError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-lg font-semibold">Nepodarilo sa načítať konverzáciu</h1>
      <p className="text-sm text-muted-foreground">{error.message || "Skúste to prosím znova."}</p>
      <div className="flex w-full gap-2">
        <Button type="button" className="flex-1" onClick={reset}>
          Skúsiť znova
        </Button>
        <Button asChild type="button" variant="outline" className="flex-1">
          <Link href="/inbox">Späť do správ</Link>
        </Button>
      </div>
    </div>
  );
}
