"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RootiePageShell } from "@/components/layout/rootie-page-shell";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RootiePageShell
      title="Stránku sa nepodarilo načítať"
      description="Skúste načítanie zopakovať."
    >
      <div className="flex flex-wrap gap-3">
        <Button onClick={retry}>Skúsiť znova</Button>
        <Button asChild variant="outline">
          <Link href="/">Späť na domov</Link>
        </Button>
      </div>
    </RootiePageShell>
  );
}
